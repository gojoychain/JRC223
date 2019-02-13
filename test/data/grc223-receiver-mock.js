module.exports = {
  abi: [
    {
      "constant": true,
      "inputs": [],
      "name": "tokenFallbackExec",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "from",
          "type": "address"
        },
        {
          "name": "amount",
          "type": "uint256"
        },
        {
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "tokenFallback",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
  bytecode: '0x608060405234801561001057600080fd5b5061014f806100206000396000f3fe608060405234801561001057600080fd5b5060043610610052577c010000000000000000000000000000000000000000000000000000000060003504638124ebe88114610057578063c0ee0b8a14610073575b600080fd5b61005f610107565b604080519115158252519081900360200190f35b6101056004803603606081101561008957600080fd5b73ffffffffffffffffffffffffffffffffffffffff823516916020810135918101906060810160408201356401000000008111156100c657600080fd5b8201836020820111156100d857600080fd5b803590602001918460018302840111640100000000831117156100fa57600080fd5b509092509050610110565b005b60005460ff1681565b50506000805460ff19166001179055505056fea165627a7a72305820d3f6bfb52ac04b691d24eee5ed9aa5e377ef39f4390f80ab313fc36a8cda7cb80029',
}
