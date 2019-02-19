const { assert } = require('chai')
const TimeMachine = require('sol-time-machine')
const sassert = require('sol-assert')

const getConstants = require('../constants')
const GRC223PreMinted = require('../data/grc223-pre-minted')

const web3 = global.web3

contract('PreMintedToken', (accounts) => {
  const { OWNER, INVALID_ADDR } = getConstants(accounts)
  const TOKEN_PARAMS = {
    name: 'TestToken',
    symbol: 'TTT',
    decimals: 8,
    totalSupply: 10000000000,
    owner: OWNER,
  }
  const timeMachine = new TimeMachine(web3)

  let token

  beforeEach(async () => {
    await timeMachine.snapshot

    token = new web3.eth.Contract(GRC223PreMinted.abi)
    token = await token.deploy({
      data: GRC223PreMinted.bytecode,
      arguments: [
        TOKEN_PARAMS.name,
        TOKEN_PARAMS.symbol, 
        TOKEN_PARAMS.decimals,
        TOKEN_PARAMS.totalSupply,
        TOKEN_PARAMS.owner,
      ],
    }).send({ from: OWNER, gas: 4712388 })
  })
  
  afterEach(async () => {
    await timeMachine.revert
  })

  describe('constructor', async () => {
    it('should initialize all the values correctly', async () => {
      assert.equal(await token.methods.owner().call(), TOKEN_PARAMS.owner)
      assert.equal(await token.methods.name().call(), TOKEN_PARAMS.name)
      assert.equal(await token.methods.symbol().call(), TOKEN_PARAMS.symbol)
      assert.equal(await token.methods.decimals().call(), TOKEN_PARAMS.decimals)
      assert.equal(await token.methods.totalSupply().call(), TOKEN_PARAMS.totalSupply)
      assert.equal(await token.methods.balanceOf(TOKEN_PARAMS.owner).call(), TOKEN_PARAMS.totalSupply)
    })

    it('should emit both Transfer events', async () => {
      sassert.event(token, 'Transfer(address,address,uint256)')
      sassert.event(token, 'Transfer(address,address,uint256,bytes)')
    })

    it('throws if owner is not valid', async () => {
      try {
        await token.deploy({
          data: GRC223PreMinted.bytecode,
          arguments: [
            TOKEN_PARAMS.name,
            TOKEN_PARAMS.symbol, 
            TOKEN_PARAMS.decimals,
            TOKEN_PARAMS.totalSupply,
            INVALID_ADDR,
          ],
        }).send({ from: OWNER, gas: 4712388 })
      } catch (e) {
        sassert.revert(e)
      }
    })

    it('throws if name is empty', async () => {
      try {
        await token.deploy({
          data: GRC223PreMinted.bytecode,
          arguments: [
            '',
            TOKEN_PARAMS.symbol, 
            TOKEN_PARAMS.decimals,
            TOKEN_PARAMS.totalSupply,
            TOKEN_PARAMS.owner,
          ],
        }).send({ from: OWNER, gas: 4712388 })
      } catch (e) {
        sassert.revert(e)
      }
    })

    it('throws if symbol is empty', async () => {
      try {
        await token.deploy({
          data: GRC223PreMinted.bytecode,
          arguments: [
            TOKEN_PARAMS.name, 
            '',
            TOKEN_PARAMS.decimals,
            TOKEN_PARAMS.totalSupply,
            TOKEN_PARAMS.owner,
          ],
        }).send({ from: OWNER, gas: 4712388 })
      } catch (e) {
        sassert.revert(e)
      }
    })

    it('throws if totalSupply is not greater than 0', async () => {
      try {
        await token.deploy({
          data: GRC223PreMinted.bytecode,
          arguments: [
            TOKEN_PARAMS.name, 
            TOKEN_PARAMS.symbol,
            TOKEN_PARAMS.decimals,
            0,
            TOKEN_PARAMS.owner,
          ],
        }).send({ from: OWNER, gas: 4712388 })
      } catch (e) {
        sassert.revert(e)
      }
    })
  })
})
