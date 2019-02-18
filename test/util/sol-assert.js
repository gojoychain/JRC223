const { assert } = require('chai');

const web3 = global.web3;

module.exports = Object.freeze({
  revert(error) {
    assert.isAbove(error.message.search('revert'), -1, 'Revert error must be returned')
  },
  invalidOpcode(error) {
    assert.isAbove(error.message.search('invalid opcode'), -1, 'Invalid opcode error must be returned')
  },
  bytesStrEqual(bytesString, string) {
    assert.equal(web3.toUtf8(bytesString), string)
  },
  event(txReceipt, eventName) {
    assert.isDefined(txReceipt.events[eventName])
  },
})
