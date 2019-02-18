const { assert } = require('chai')

const getConstants = require('../constants')
const TimeMachine = require('../util/time-machine')
const sassert = require('../util/sol-assert')
const GRC223Mock = require('../data/grc223-mock')
const GRC223ReceiverMock = require('../data/grc223-receiver-mock')
const NonReceiverMock = require('../data/non-receiver-mock')

const web3 = global.web3

contract('GRC223', (accounts) => {
  const timeMachine = new TimeMachine(web3)
  const { OWNER, ACCT1, ACCT2, ACCT3, INVALID_ADDR } = getConstants(accounts)
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

  beforeEach(async () => {
    await timeMachine.snapshot

    token = new web3.eth.Contract(GRC223Mock.abi)
    token = await token.deploy({
      data: GRC223Mock.bytecode,
      arguments: [
        TOKEN_PARAMS.name,
        TOKEN_PARAMS.symbol, 
        TOKEN_PARAMS.decimals,
        TOKEN_PARAMS.initialAccount,
        TOKEN_PARAMS.initialBalance,
      ],
    }).send({ from: OWNER, gas: 4712388 })

    receiver = new web3.eth.Contract(GRC223ReceiverMock.abi)
    receiver = await receiver.deploy({
      data: GRC223ReceiverMock.bytecode,
      arguments: [],
    }).send({ from: OWNER, gas: 4712388 })
    
    nonReceiver = new web3.eth.Contract(NonReceiverMock.abi)
    nonReceiver = await nonReceiver.deploy({
      data: NonReceiverMock.bytecode,
      arguments: [],
    }).send({ from: OWNER, gas: 4712388 })
  })
  
  afterEach(async () => {
    await timeMachine.revert
  })

  describe('constructor', async () => {
    it('should initialize all the values correctly', async () => {
      assert.equal(await token.methods.balanceOf(OWNER).call(), TOKEN_PARAMS.initialBalance)
      assert.equal(await token.methods.totalSupply().call(), TOKEN_PARAMS.initialBalance)
    })
  })

  describe('name()', async () => {
    it('returns the token name', async () => {
      assert.equal(await token.methods.name().call(), TOKEN_PARAMS.name)
    })
  })

  describe('symbol()', async () => {
    it('returns the token symbol', async () => {
      assert.equal(await token.methods.symbol().call(), TOKEN_PARAMS.symbol)
    })
  })

  describe('decimals()', async () => {
    it('returns the token decimals', async () => {
      assert.equal(await token.methods.decimals().call(), TOKEN_PARAMS.decimals)
    })
  })

  describe('balanceOf()', async () => {
    it('should return the right balance', async () => {
      assert.equal(await token.methods.balanceOf(OWNER).call(), TOKEN_PARAMS.initialBalance)
      assert.equal(await token.methods.balanceOf(ACCT1).call(), 0)
      assert.equal(await token.methods.balanceOf(ACCT2).call(), 0)
    })
  })

  describe('allowance()', async () => {
    it('should return the right allowance', async () => {
      const acct1Allowance = 1000
      await token.methods.approve(ACCT1, acct1Allowance).send({ from: OWNER })
      assert.equal(await token.methods.allowance(OWNER, ACCT1).call(), acct1Allowance)

      const acct2Allowance = 3000
      await token.methods.approve(ACCT2, acct2Allowance).send({ from: OWNER })
      assert.equal(await token.methods.allowance(OWNER, ACCT2).call(), acct2Allowance)

      assert.equal(await token.methods.allowance(OWNER, ACCT3).call(), 0)
    })
  })

  describe('transfer() with data', () => {
    it('transfers the token to a wallet address', async () => {
      let ownerBalance = TOKEN_PARAMS.initialBalance
      assert.equal(await token.methods.balanceOf(OWNER).call(), ownerBalance)

      // transfer from OWNER to accounts[1]
      const acct1TransferAmt = 300000
      await token.methods['transfer(address,uint256,bytes)'](
        ACCT1,
        acct1TransferAmt,
        [0x0],
      ).send({ from: OWNER })
      assert.equal(await token.methods.balanceOf(ACCT1).call(), acct1TransferAmt)

      ownerBalance -= acct1TransferAmt
      assert.equal(await token.methods.balanceOf(OWNER).call(), ownerBalance)

      // transfer from OWNER to accounts[2]
      const acct2TransferAmt = 250000
      await token.methods['transfer(address,uint256,bytes)'](
        ACCT2,
        acct2TransferAmt,
        [0x0],
      ).send({ from: OWNER })
      assert.equal(await token.methods.balanceOf(ACCT2).call(), acct2TransferAmt)

      ownerBalance -= acct2TransferAmt
      assert.equal(await token.methods.balanceOf(OWNER).call(), ownerBalance)

      // transfer from accounts[2] to accounts[3]
      await token.methods['transfer(address,uint256,bytes)'](
        ACCT3,
        acct2TransferAmt,
        [0x0],
      ).send({ from: ACCT2 })
      assert.equal(await token.methods.balanceOf(ACCT3).call(), acct2TransferAmt)
      assert.equal(await token.methods.balanceOf(ACCT2).call(), 0)
    })

    it('transfers the token to GRC223 contract and calls tokenFallback', async () => {
      assert.equal(await token.methods.balanceOf(OWNER).call(), TOKEN_PARAMS.initialBalance)
      assert.isFalse(await receiver.methods.tokenFallbackExec().call())

      const transferAmt = 1234567
      await token.methods['transfer(address,uint256,bytes)'](
        receiver._address,
        transferAmt,
        [0x0],
      ).send({ from: OWNER })

      assert.equal(await token.methods.balanceOf(OWNER).call(), TOKEN_PARAMS.initialBalance - transferAmt)
      assert.equal(await token.methods.balanceOf(receiver._address).call(), transferAmt)
      assert.isTrue(await receiver.methods.tokenFallbackExec().call())
    })

    it('should emit both Transfer events', async () => {
      const transferAmt = 1234567
      const receipt = await token.methods['transfer(address,uint256,bytes)'](
        receiver._address,
        transferAmt,
        [0x0],
      ).send({ from: OWNER })
      sassert.event(receipt, 'Transfer')
      sassert.event(receipt, 'Transfer223')
    })

    it('throws when sending to a non-GRC223 contract that didnt implement the tokenFallback', async () => {
      assert.equal(await token.methods.balanceOf(OWNER).call(), TOKEN_PARAMS.initialBalance)
      assert.isFalse(await nonReceiver.methods.tokenFallbackExec().call())

      const transferAmt = 1234567
      try {
        await token.methods['transfer(address,uint256,bytes)'](
          nonReceiver._address, 
          transferAmt, 
          [0x0],
        ).send({ from: OWNER })
      } catch (e) {
        sassert.revert(e)
      }
      
      assert.equal(await token.methods.balanceOf(OWNER).call(), TOKEN_PARAMS.initialBalance)
      assert.equal(await token.methods.balanceOf(nonReceiver._address).call(), 0)
      assert.isFalse(await nonReceiver.methods.tokenFallbackExec().call())
    })

    it('throws if the to address is not valid', async () => {
      try {
        await token.methods['transfer(address,uint256,bytes)'](
          INVALID_ADDR,
          1000,
          [0x0],
        ).send({ from: OWNER })
      } catch (e) {
        sassert.revert(e)
      }
    })

    it('throws if the balance of the transferer is less than the amount', async () => {
      assert.equal(await token.methods.balanceOf(OWNER).call(), TOKEN_PARAMS.initialBalance)
      try {
        await token.methods['transfer(address,uint256,bytes)'](
          ACCT1,
          TOKEN_PARAMS.initialBalance + 1,
          [0x0],
        ).send({ from: OWNER })
      } catch (e) {
        sassert.invalidOpcode(e)
      }

      try {
        await token.methods['transfer(address,uint256,bytes)'](
          ACCT3, 
          1, 
          [0x0],
        ).send({ from: ACCT2 })
      } catch (e) {
        sassert.invalidOpcode(e)
      }
    })
  })

  describe('transfer() without data', async () => {
    it('should allow transfers if the account has tokens', async () => {
      let ownerBalance = TOKEN_PARAMS.initialBalance
      assert.equal(await token.methods.balanceOf(OWNER).call(), ownerBalance)

      // transfer from OWNER to accounts[1]
      const acct1TransferAmt = 300000
      await token.methods['transfer(address,uint256)'](
        ACCT1,
        acct1TransferAmt,
      ).send({ from: OWNER })
      assert.equal(await token.methods.balanceOf(ACCT1).call(), acct1TransferAmt)

      ownerBalance -= acct1TransferAmt
      assert.equal(await token.methods.balanceOf(OWNER).call(), ownerBalance)

      // transfer from OWNER to accounts[2]
      const acct2TransferAmt = 250000
      await token.methods['transfer(address,uint256)'](
        ACCT2,
        acct2TransferAmt,
      ).send({ from: OWNER })
      assert.equal(await token.methods.balanceOf(ACCT2).call(), acct2TransferAmt)

      ownerBalance -= acct2TransferAmt
      assert.equal(await token.methods.balanceOf(OWNER).call(), ownerBalance)

      // transfer from accounts[2] to accounts[3]
      await token.methods['transfer(address,uint256)'](
        ACCT3,
        acct2TransferAmt,
      ).send({ from: ACCT2 })
      assert.equal(await token.methods.balanceOf(ACCT3).call(), acct2TransferAmt)
      assert.equal(await token.methods.balanceOf(ACCT2).call(), 0)
    })

    it('should emit both Transfer events', async () => {
      const receipt = await token.methods['transfer(address,uint256)'](
        ACCT1,
        1,
      ).send({ from: OWNER })
      sassert.event(receipt, 'Transfer')
      sassert.event(receipt, 'Transfer223')
    })

    it('should throw if the to address is not valid', async () => {
      try {
        await token.methods['transfer(address,uint256)'](
          INVALID_ADDR,
          1,
        ).send({ from: OWNER })
      } catch (e) {
        sassert.revert(e)
      }
    })

    it('should throw if the balance of the transferer is less than the amount', async () => {
      assert.equal(await token.methods.balanceOf(OWNER).call(), TOKEN_PARAMS.initialBalance)
      try {
        await token.methods['transfer(address,uint256)'](
          ACCT1,
          TOKEN_PARAMS.initialBalance + 1,
        ).send({ from: OWNER })
      } catch (e) {
        sassert.invalidOpcode(e)
      }

      try {
        await token.methods['transfer(address,uint256)'](
          ACCT3,
          1,
        ).send({ from: ACCT2 })
      } catch (e) {
        sassert.invalidOpcode(e)
      }
    })
  })

  describe('approve()', async () => {
    it('should allow approving', async () => {
      const acct1Allowance = 1000
      await token.methods.approve(ACCT1, acct1Allowance).send({ from: OWNER })
      assert.equal(await token.methods.allowance(OWNER, ACCT1).call(), acct1Allowance)

      const acct2Allowance = 3000
      await token.methods.approve(ACCT2, acct2Allowance).send({ from: OWNER })
      assert.equal(await token.methods.allowance(OWNER, ACCT2).call(), acct2Allowance)
    })

    it('should throw if the value is not 0 and has previous approval', async () => {
      const acct1Allowance = 1000
      await token.methods.approve(ACCT1, acct1Allowance).send({ from: OWNER })
      assert.equal(await token.methods.allowance(OWNER, ACCT1).call(), acct1Allowance)

      try {
        await token.methods.approve(ACCT1, 123).send({ from: OWNER })
      } catch (e) {
        sassert.revert(e)
      }
    })
  })

  describe('transferFrom()', async () => {
    it('should allow transferring the allowed amount', async () => {
      let ownerBalance = TOKEN_PARAMS.initialBalance

      // transfers from OWNER to accounts[1]
      const acct1Allowance = 1000
      await token.methods.approve(ACCT1, acct1Allowance).send({ from: OWNER })
      assert.equal(await token.methods.allowance(OWNER, ACCT1).call(), acct1Allowance)

      await token.methods.transferFrom(OWNER, ACCT1, acct1Allowance).send({ from: ACCT1 })
      assert.equal(await token.methods.balanceOf(ACCT1).call(), acct1Allowance)

      ownerBalance -= acct1Allowance
      assert.equal(await token.methods.balanceOf(OWNER).call(), ownerBalance)

      // transfers from OWNER to accounts[2]
      const acct2Allowance = 3000
      await token.methods.approve(ACCT2, acct2Allowance).send({ from: OWNER })
      assert.equal(await token.methods.allowance(OWNER, ACCT2).call(), acct2Allowance)

      await token.methods.transferFrom(OWNER, ACCT2, acct2Allowance).send({ from: ACCT2 })
      assert.equal(await token.methods.balanceOf(ACCT2).call(), acct2Allowance)

      ownerBalance -= acct2Allowance
      assert.equal(await token.methods.balanceOf(OWNER).call(), ownerBalance)

      // transfers from accounts[2] to accounts[3]
      const acct3Allowance = 3000
      await token.methods.approve(ACCT3, acct3Allowance).send({ from: ACCT2 })
      assert.equal(await token.methods.allowance(ACCT2, ACCT3).call(), acct3Allowance)

      await token.methods.transferFrom(ACCT2, ACCT3, acct3Allowance).send({ from: ACCT3 })
      assert.equal(await token.methods.balanceOf(ACCT3).call(), acct3Allowance)
      assert.equal(await token.methods.balanceOf(ACCT2).call(), 0)
    })

    it('should throw if the to address is not valid', async () => {
      try {
        await token.methods.transferFrom(OWNER, INVALID_ADDR, 1000).send({ from: ACCT1 })
      } catch (e) {
        sassert.revert(e)
      }
    })

    it('should throw if the from balance is less than the transferring amount', async () => {
      const acct1Allowance = TOKEN_PARAMS.initialBalance + 1
      await token.methods.approve(ACCT1, acct1Allowance).send({ from: OWNER })
      assert.equal(await token.methods.allowance(OWNER, ACCT1).call(), acct1Allowance)

      try {
        await token.methods.transferFrom(OWNER, ACCT1, acct1Allowance).send({ from: ACCT1 })
      } catch (e) {
        sassert.invalidOpcode(e)
      }
    })

    it('should throw if the value is more than the allowed amount', async () => {
      const acct1Allowance = 1000
      await token.methods.approve(ACCT1, acct1Allowance).send({ from: OWNER })
      assert.equal(await token.methods.allowance(OWNER, ACCT1).call(), acct1Allowance)

      try {
        await token.methods.transferFrom(OWNER, ACCT1, acct1Allowance + 1).send({ from: ACCT1 })
      } catch (e) {
        sassert.invalidOpcode(e)
      }
    })
  })
})
