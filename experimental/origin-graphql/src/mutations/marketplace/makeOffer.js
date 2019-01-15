import { post } from 'origin-ipfs'
import validator from 'origin-validator'
import txHelper, { checkMetaMask } from '../_txHelper'
import contracts from '../../contracts'
import parseId from '../../utils/parseId'
const ZeroAddress = '0x0000000000000000000000000000000000000000'

async function makeOffer(_, data) {
  await checkMetaMask(data.from)
  const { listingId } = parseId(data.listingID)
  const listing = await contracts.eventSource.getListing(listingId)

  const ipfsData = {
    schemaId: 'https://schema.originprotocol.com/offer_1.0.0.json',
    listingId,
    listingType: 'unit',
    unitsPurchased: Number.parseInt(data.quantity),
    totalPrice: {
      amount: data.value,
      currency: 'ETH'
    },
    commission: {
      amount: data.commission || '0',
      currency: 'OGN'
    },
    finalizes:
      data.finalizes || Math.round(+new Date() / 1000) + 60 * 60 * 24 * 365
  }

  validator('https://schema.originprotocol.com/offer_1.0.0.json', ipfsData)

  const buyer = data.from
  const marketplace = contracts.marketplaceExec

  const affiliateWhitelistDisabled = await marketplace.methods
    .allowedAffiliates(marketplace.options.address)
    .call()

  const affiliate = data.affiliate
    || (listing.affiliate && listing.affiliate.id)
    || ZeroAddress
  if (!affiliateWhitelistDisabled) {
    const affiliateAllowed = await marketplace.methods
      .allowedAffiliates(affiliate)
      .call()

    if (!affiliateAllowed) {
      throw new Error('Affiliate not on whitelist')
    }
  }

  const ipfsHash = await post(contracts.ipfsRPC, ipfsData)
  const commission = contracts.web3.utils.toWei(ipfsData.commission.amount, 'ether')
  const value = contracts.web3.utils.toWei(data.value, 'ether')
  const arbitrator = data.arbitrator
    || (listing.arbitrator && listing.arbitrator.id)
    || ZeroAddress

  const args = [
    listingId,
    ipfsHash,
    ipfsData.finalizes,
    affiliate,
    commission,
    value,
    data.currency || ZeroAddress,
    arbitrator
  ]
  if (data.withdraw) {
    const { offerId } = parseId(data.withdraw)
    args.push(offerId)
  }

  const tx = marketplace.methods.makeOffer(...args).send({
    gas: 4612388,
    from: buyer,
    value
  })
  return txHelper({ tx, mutation: 'makeOffer' })
}

export default makeOffer

/*
mutation makeOffer(
  $listingID: String,
  $finalizes: String,
  $affiliate: String,
  $commission: String,
  $value: String,
  $currency: String,
  $arbitrator: String
) {
  makeOffer(
    listingID: $listingID,
    finalizes: $finalizes,
    affiliate: $affiliate,
    commission: $commission,
    value: $value,
    currency: $currency,
    arbitrator: $arbitrator
  )
}
{
  "listingID": "0",
  "finalizes": "1536300000",
  "affiliate": "0x7c38A2934323aAa8dAda876Cfc147C8af40F8D0e",
  "commission": "0",
  "value": "100000000000000000",
  "currency": "0x0000000000000000000000000000000000000000",
  "arbitrator": "0x7c38A2934323aAa8dAda876Cfc147C8af40F8D0e"
}
*/
