const { assert } = require('chai')

const TimeMachine = require('../util/time-machine')
const sassert = require('../util/sol-assert')
const getConstants = require('../constants')
const GRC223Factory = require('../data/grc223-factory')

contract('GRC223Factory', (accounts) => {
  const { OWNER, ACCT1, ACCT2, INVALID_ADDR } = getConstants(accounts)
  const timeMachine = new TimeMachine(web3)

  let factory

  beforeEach(async () => {
    await timeMachine.snapshot

    factory = new web3.eth.Contract(GRC223Factory.abi)
    factory = await factory.deploy({
      data: GRC223Factory.bytecode,
      arguments: [],
    }).send({ from: OWNER, gas: 4712388 })
  })

  afterEach(async () => {
    await timeMachine.revert
  })

  describe.only('createGRC223PreMinted', () => {
    // TODO: Contract deploys fine on Remix, but test does not pass
    it('should create a new token contract', async () => {
      const tx1 = await factory.methods.createGRC223PreMinted(
        'TestToken1', 'TT1', 8, 1000000, ACCT1
      ).send({ from: ACCT1 })
      const token1Addr = tx1.logs[0].args.tokenAddress
      assert.isDefined(token1Addr)
      assert.notEqual(token1Addr, INVALID_ADDR)
      sassert.event(tx1, 'GRC223PreMintedCreated')

      const tx2 = await factory.methods.createGRC223PreMinted(
        'TestToken2', 'TT2', 8, 1000000, ACCT2
      ).send({ from: ACCT2 })
      const token2Addr = tx2.logs[0].args.tokenAddress
      assert.isDefined(token2Addr)
      assert.notEqual(token2Addr, INVALID_ADDR)
      sassert.event(tx2, 'GRC223PreMintedCreated')

      assert.notEqual(token1Addr, token2Addr)
    })
  })
})
