const { assert } = require('chai')
const TimeMachine = require('sol-time-machine')
const sassert = require('sol-assert')

const getConstants = require('../constants')
const JRC223Factory = require('../data/jrc223-factory')

contract('JRC223Factory', (accounts) => {
  const { OWNER, ACCT1, ACCT2, INVALID_ADDR } = getConstants(accounts)
  const timeMachine = new TimeMachine(global.web3)

  let factory

  beforeEach(async () => {
    await timeMachine.snapshot

    factory = new web3.eth.Contract(JRC223Factory.abi)
    factory = await factory.deploy({
      data: JRC223Factory.bytecode,
      arguments: [],
    }).send({ from: OWNER, gas: 4712388 })
  })

  afterEach(async () => {
    await timeMachine.revert
  })

  // TODO: Contract deploys fine on Remix, but tests does not pass
  describe('createJRC223PreMinted', () => {
    it('should create a new token contract', async () => {
      const tx1 = await factory.methods.createJRC223PreMinted(
        'TestToken1', 'TT1', 8, 1000000, ACCT1
      ).send({ from: ACCT1 })
      const token1Addr = tx1.logs[0].args.tokenAddress
      assert.isDefined(token1Addr)
      assert.notEqual(token1Addr, INVALID_ADDR)

      const tx2 = await factory.methods.createJRC223PreMinted(
        'TestToken2', 'TT2', 8, 1000000, ACCT2
      ).send({ from: ACCT2 })
      const token2Addr = tx2.logs[0].args.tokenAddress
      assert.isDefined(token2Addr)
      assert.notEqual(token2Addr, INVALID_ADDR)

      assert.notEqual(token1Addr, token2Addr)
    })

    it('should emit the created event', async () => {
      const tx1 = await factory.methods.createJRC223PreMinted(
        'TestToken1', 'TT1', 8, 1000000, ACCT1
      ).send({ from: ACCT1 })
      sassert.event(tx1, 'JRC223PreMintedCreated')
    })
  })
})
