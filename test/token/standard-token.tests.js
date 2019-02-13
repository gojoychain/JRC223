const { assert } = require('chai')

const TimeMachine = require('../util/time-machine')
const sassert = require('../util/sol-assert')
const ABI = require('../data/abi')
const StandardTokenMock = artifacts.require('./mock/StandardTokenMock.sol')
const GRC223ReceiverMock = artifacts.require('./mock/GRC223ReceiverMock.sol')
const NonReceiverMock = artifacts.require('./mock/NonReceiverMock.sol')

const web3 = global.web3

contract('StandardToken', (accounts) => {
  const timeMachine = new TimeMachine(web3)
  const OWNER = accounts[0]
  const ACCT1 = accounts[1]
  const ACCT2 = accounts[2]
  const ACCT3 = accounts[3]
  const TOKEN_PARAMS = {
    name: 'TestToken',
    symbol: 'TTT',
    decimals: 8,
    initialAccount: OWNER,
    initialBalance: 10000000,
  }

  let token
  let receiver
  let nonReceiver

  beforeEach(timeMachine.snapshot)
  afterEach(timeMachine.revert)

  beforeEach(async () => {
    token = await StandardTokenMock.new(...Object.values(TOKEN_PARAMS), { from: OWNER })
    receiver = await GRC223ReceiverMock.new({ from: OWNER })
    nonReceiver = await NonReceiverMock.new({ from: OWNER })
  })

  describe('constructor', async () => {
    it('should initialize all the values correctly', async () => {
      assert.equal(await token.balanceOf(OWNER, { from: OWNER }), TOKEN_PARAMS.initialBalance)
      assert.equal(await token.totalSupply.call(), TOKEN_PARAMS.initialBalance)
    })
  })

  describe('name()', async () => {
    it('returns the token name', async () => {
      assert.equal(await token.name.call(), TOKEN_PARAMS.name)
    })
  })

  describe('symbol()', async () => {
    it('returns the token symbol', async () => {
      assert.equal(await token.symbol.call(), TOKEN_PARAMS.symbol)
    })
  })

  describe('decimals()', async () => {
    it('returns the token decimals', async () => {
      assert.equal(await token.decimals.call(), TOKEN_PARAMS.decimals)
    })
  })

  describe('balanceOf()', async () => {
    it('should return the right balance', async () => {
      assert.equal(await token.balanceOf(OWNER), TOKEN_PARAMS.initialBalance)
      assert.equal(await token.balanceOf(ACCT1), 0)
      assert.equal(await token.balanceOf(ACCT2), 0)
    })
  })

  describe('allowance()', async () => {
    it('should return the right allowance', async () => {
      const acct1Allowance = 1000
      await token.approve(ACCT1, acct1Allowance, { from: OWNER })
      assert.equal(await token.allowance(OWNER, ACCT1), acct1Allowance)

      const acct2Allowance = 3000
      await token.approve(ACCT2, acct2Allowance, { from: OWNER })
      assert.equal(await token.allowance(OWNER, ACCT2), acct2Allowance)

      assert.equal(await token.allowance(OWNER, ACCT3), 0)
    })
  })

  describe('transfer() with data', () => {
    it('transfers the token to a wallet address', async () => {
      let ownerBalance = TOKEN_PARAMS.initialBalance
      assert.equal(await token.balanceOf(OWNER, { from: OWNER }), ownerBalance)

      // transfer from OWNER to accounts[1]
      const acct1TransferAmt = 300000
      await token.transfer(ACCT1, acct1TransferAmt, { from: OWNER })
      assert.equal(await token.balanceOf(ACCT1), acct1TransferAmt)

      ownerBalance -= acct1TransferAmt
      assert.equal(await token.balanceOf(OWNER), ownerBalance)

      // transfer from OWNER to accounts[2]
      const acct2TransferAmt = 250000
      await token.transfer(ACCT2, acct2TransferAmt, { from: OWNER })
      assert.equal(await token.balanceOf(ACCT2), acct2TransferAmt)

      ownerBalance -= acct2TransferAmt
      assert.equal(await token.balanceOf(OWNER, { from: OWNER }), ownerBalance)

      // transfer from accounts[2] to accounts[3]
      await token.transfer(ACCT3, acct2TransferAmt, { from: ACCT2 })
      assert.equal(await token.balanceOf(ACCT3), acct2TransferAmt)
      assert.equal(await token.balanceOf(ACCT2), 0)
    })

    it('transfers the token to GRC223 contract and calls tokenFallback', async () => {
      assert.equal(await token.balanceOf(OWNER, { from: OWNER }), TOKEN_PARAMS.initialBalance)
      assert.isFalse(await receiver.tokenFallbackExec.call())

      const transferAmt = 1234567
      const contract = new web3.eth.Contract(ABI.StandardTokenMock, token.address)
      await contract.methods['transfer(address,uint256,bytes)'](receiver.address, transferAmt, [0x0]).send({ from: OWNER })

      assert.equal(await contract.methods.balanceOf(OWNER).call(), TOKEN_PARAMS.initialBalance - transferAmt)
      assert.equal(await contract.methods.balanceOf(receiver.address).call(), transferAmt)
      assert.isTrue(await receiver.tokenFallbackExec.call())
    })

    it('should emit both Transfer events', async () => {
      const transferAmt = 1234567
      const contract = new web3.eth.Contract(ABI.StandardTokenMock, token.address)
      let receipt = await contract.methods['transfer(address,uint256)'](receiver.address, transferAmt).send({ from: OWNER })
      assert.isDefined(receipt.events.Transfer)
      assert.isDefined(receipt.events.Transfer223)

      receipt = await contract.methods['transfer(address,uint256,bytes)'](receiver.address, transferAmt, [0x0]).send({ from: OWNER })
      assert.isDefined(receipt.events.Transfer)
      assert.isDefined(receipt.events.Transfer223)
    })

    it('throws when sending to a non-GRC223 contract that didnt implement the tokenFallback', async () => {
      assert.equal(await token.balanceOf(OWNER, { from: OWNER }), TOKEN_PARAMS.initialBalance)
      assert.isFalse(await nonReceiver.tokenFallbackExec.call())

      const contract = new web3.eth.Contract(ABI.StandardTokenMock, token.address)
      const transferAmt = 1234567
      try {
        await contract.methods['transfer(address,uint256,bytes)'](nonReceiver.address, transferAmt, [0x0]).send({ from: OWNER })
      } catch (e) {
        sassert.assertRevert(e)
      }
      
      assert.equal(await contract.methods.balanceOf(OWNER).call(), TOKEN_PARAMS.initialBalance)
      assert.equal(await contract.methods.balanceOf(nonReceiver.address).call(), 0)
      assert.isFalse(await nonReceiver.tokenFallbackExec.call())
    })

    it('throws if the to address is not valid', async () => {
      try {
        await token.transfer(0, 1000, undefined, { from: OWNER })
      } catch (e) {
        sassert.assertRevert(e)
      }
    })

    it('throws if the balance of the transferer is less than the amount', async () => {
      assert.equal(await token.balanceOf(OWNER), TOKEN_PARAMS.initialBalance)
      try {
        await token.transfer(ACCT1, TOKEN_PARAMS.initialBalance + 1, undefined, { from: OWNER })
      } catch (e) {
        sassert.assertInvalidOpcode(e)
      }

      try {
        await token.transfer(ACCT3, 1, undefined, { from: ACCT2 })
      } catch (e) {
        sassert.assertInvalidOpcode(e)
      }
    })
  })

  describe('transfer() without data', async () => {
    it('should allow transfers if the account has tokens', async () => {
      let ownerBalance = TOKEN_PARAMS.initialBalance
      assert.equal(await token.balanceOf(OWNER, { from: OWNER }), ownerBalance)

      // transfer from OWNER to accounts[1]
      const acct1TransferAmt = 300000
      await token.transfer(ACCT1, acct1TransferAmt, { from: OWNER })
      assert.equal(await token.balanceOf(ACCT1), acct1TransferAmt)

      ownerBalance -= acct1TransferAmt
      assert.equal(await token.balanceOf(OWNER), ownerBalance)

      // transfer from OWNER to accounts[2]
      const acct2TransferAmt = 250000
      await token.transfer(ACCT2, acct2TransferAmt, { from: OWNER })
      assert.equal(await token.balanceOf(ACCT2), acct2TransferAmt)

      ownerBalance -= acct2TransferAmt
      assert.equal(await token.balanceOf(OWNER, { from: OWNER }), ownerBalance)

      // transfer from accounts[2] to accounts[3]
      await token.transfer(ACCT3, acct2TransferAmt, { from: ACCT2 })
      assert.equal(await token.balanceOf(ACCT3), acct2TransferAmt)
      assert.equal(await token.balanceOf(ACCT2), 0)
    })

    it('should emit both Transfer events', async () => {
      token.Transfer['address,address,uint256']()
      .watch((err, res) => {
        assert.isNull(err)
        assert.equal(res.event, 'Transfer')
      })

      token.Transfer['address,address,uint256,bytes']()
      .watch((err, res) => {
        assert.isNull(err)
        assert.equal(res.event, 'Transfer')
      })
    })

    it('should throw if the to address is not valid', async () => {
      try {
        await token.transfer(0, 1000, { from: OWNER })
      } catch (e) {
        sassert.assertRevert(e)
      }
    })

    it('should throw if the balance of the transferer is less than the amount', async () => {
      assert.equal(await token.balanceOf(OWNER), TOKEN_PARAMS.initialBalance)
      try {
        await token.transfer(ACCT1, TOKEN_PARAMS.initialBalance + 1, { from: OWNER })
      } catch (e) {
        sassert.assertInvalidOpcode(e)
      }

      try {
        await token.transfer(ACCT3, 1, { from: ACCT2 })
      } catch (e) {
        sassert.assertInvalidOpcode(e)
      }
    })
  })

  describe('approve()', async () => {
    it('should allow approving', async () => {
      const acct1Allowance = 1000
      await token.approve(ACCT1, acct1Allowance, { from: OWNER })
      assert.equal(await token.allowance(OWNER, ACCT1), acct1Allowance)

      const acct2Allowance = 3000
      await token.approve(ACCT2, acct2Allowance, { from: OWNER })
      assert.equal(await token.allowance(OWNER, ACCT2), acct2Allowance)
    })

    it('should throw if the value is not 0 and has previous approval', async () => {
      const acct1Allowance = 1000
      await token.approve(ACCT1, acct1Allowance, { from: OWNER })
      assert.equal(await token.allowance(OWNER, ACCT1), acct1Allowance)

      try {
        await token.approve(ACCT1, 123, { from: OWNER })
      } catch (e) {
        sassert.assertRevert(e)
      }
    })
  })

  describe('transferFrom()', async () => {
    it('should allow transferring the allowed amount', async () => {
      let ownerBalance = TOKEN_PARAMS.initialBalance

      // transfers from OWNER to accounts[1]
      const acct1Allowance = 1000
      await token.approve(ACCT1, acct1Allowance, { from: OWNER })
      assert.equal(await token.allowance(OWNER, ACCT1), acct1Allowance)

      await token.transferFrom(OWNER, ACCT1, acct1Allowance, { from: ACCT1 })
      assert.equal(await token.balanceOf(ACCT1), acct1Allowance)

      ownerBalance -= acct1Allowance
      assert.equal(await token.balanceOf(OWNER), ownerBalance)

      // transfers from OWNER to accounts[2]
      const acct2Allowance = 3000
      await token.approve(ACCT2, acct2Allowance, { from: OWNER })
      assert.equal(await token.allowance(OWNER, ACCT2), acct2Allowance)

      await token.transferFrom(OWNER, ACCT2, acct2Allowance, { from: ACCT2 })
      assert.equal(await token.balanceOf(ACCT2), acct2Allowance)

      ownerBalance -= acct2Allowance
      assert.equal(await token.balanceOf(OWNER), ownerBalance)

      // transfers from accounts[2] to accounts[3]
      const acct3Allowance = 3000
      await token.approve(ACCT3, acct3Allowance, { from: ACCT2 })
      assert.equal(await token.allowance(ACCT2, ACCT3), acct3Allowance)

      await token.transferFrom(ACCT2, ACCT3, acct3Allowance, { from: ACCT3 })
      assert.equal(await token.balanceOf(ACCT3), acct3Allowance)
      assert.equal(await token.balanceOf(ACCT2), 0)
    })

    it('should throw if the to address is not valid', async () => {
      try {
        await token.transferFrom(OWNER, 0, 1000, { from: ACCT1 })
      } catch (e) {
        sassert.assertRevert(e)
      }
    })

    it('should throw if the from balance is less than the transferring amount', async () => {
      const acct1Allowance = TOKEN_PARAMS.initialBalance + 1
      await token.approve(ACCT1, acct1Allowance, { from: OWNER })
      assert.equal(await token.allowance(OWNER, ACCT1), acct1Allowance)

      try {
        await token.transferFrom(OWNER, ACCT1, acct1Allowance, { from: ACCT1 })
      } catch (e) {
        sassert.assertInvalidOpcode(e)
      }
    })

    it('should throw if the value is more than the allowed amount', async () => {
      const acct1Allowance = 1000
      await token.approve(ACCT1, acct1Allowance, { from: OWNER })
      assert.equal(await token.allowance(OWNER, ACCT1), acct1Allowance)

      try {
        await token.transferFrom(OWNER, ACCT1, acct1Allowance + 1, { from: ACCT1 })
      } catch (e) {
        sassert.assertInvalidOpcode(e)
      }
    })
  })
})
