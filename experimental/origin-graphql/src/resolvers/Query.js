import contracts from '../contracts'

let ethPrice, activeMessaging
const marketplaceExists = {}

export default {
  config: () => contracts.net,
  configObj: () => contracts.config,
  web3: () => ({}),
  marketplace: async () => {
    const address = contracts.marketplace.options.address
    if (marketplaceExists[address]) {
      return contracts.marketplace
    }
    try {
      const exists = await contracts.web3.eth.getCode(address)
      if (exists && exists.length > 2) {
        marketplaceExists[address] = true
        return contracts.marketplace
      }
    } catch (e) {
      /* Ignore */
    }
  },
  contracts: () => {
    let contracts = []
    try {
      contracts = JSON.parse(window.localStorage.contracts)
    } catch (e) {
      /* Ignore  */
    }
    return contracts
  },
  marketplaces: () => contracts.marketplaces,
  userRegistry: () => {
    const address = contracts.userRegistry.options.address
    if (!address) return null
    return contracts.userRegistry
  },
  identity: (_, args) => ({ id: args.id }),
  tokens: () => contracts.tokens,
  token: (_, args) => {
    if (args.id === '0x0000000000000000000000000000000000000000') {
      return {
        id: '0x0000000000000000000000000000000000000000',
        address: '0x0000000000000000000000000000000000000000',
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      }
    }
    return contracts.tokens.find(t => t.id === args.id)
  },
  ethUsd: () =>
    new Promise((resolve, reject) => {
      if (ethPrice) {
        return resolve(ethPrice)
      }
      fetch('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD')
        .then(response => response.json())
        .then(response => {
          ethPrice = response.USD
          resolve(response.USD)
        })
        .catch(reject)
    }),
  messaging: (_, args) =>
    new Promise(async resolve => {
      return null
      let id = args.id
      if (id === 'defaultAccount') {
        const accounts = await contracts.metaMask.eth.getAccounts()
        if (!accounts || !accounts.length) return null
        id = accounts[0]
      } else if (id === 'currentAccount') {
        if (contracts.messaging.account_key) {
          id = contracts.messaging.account_key
        }
      }
      id = contracts.web3.utils.toChecksumAddress(id)
      if (activeMessaging === id) {
        return resolve({ id })
      }
      contracts.messaging.events.once('initRemote', async () => {
        activeMessaging = id
        setTimeout(() => resolve({ id }), 500)
      })
      await contracts.messaging.init(id)
    }),

  notifications: () => {
    return {
      pageInfo: {
        endCursor: '',
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: ''
      },
      totalCount: 0,
      totalUnread: 0,
      nodes: []
    }
  }
}
