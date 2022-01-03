import { unixNow } from '@xrplmeta/utils'


const candlestickIntervals = {
	'5m': 60 * 5,
	'15m': 60 * 15,
	'1h': 60 * 60,
	'4h': 60 * 60 * 4,
	'1d': 60 * 60 * 24,
}


export async function currencies(ctx){
	let limit = ctx.parameters.limit || 100
	let offset = ctx.parameters.offset || 0
	let minTokens = ctx.parameters.min_tokens || 100
	let filter = ctx.parameters.filter
	let total = ctx.cache.currencies.count()
	let currencies = ctx.cache.currencies.all({limit, offset, filter})
	let stacks = []


	for(let { currency, marketcap, volume } of currencies){
		let tokens = ctx.cache.tokens.all({
			currency,
			minAccounts: minTokens,
			limit: 3
		})

		if(tokens.length === 0)
			continue

		stacks.push({
			currency,
			tokens,
			stats: {
				marketcap: marketcap.toString(),
				volume: volume.toString()
			}
		})
	}

	return {
		currencies: stacks, 
		count: total
	}
}

export async function token(ctx){
	let { currency, issuer, full } = ctx.parameters
	let { id, ...token } = ctx.cache.tokens.get({currency, issuer}, full)
	
	if(!token){
		throw {message: `token not listed`, expose: true}
	}

	return token
}

export async function token_history(ctx){
	let { currency, issuer, start, end } = ctx.parameters
	let { id, ...token } = ctx.cache.tokens.get({currency, issuer})

	if(!token){
		throw {message: `token not listed`, expose: true}
	}

	let stats = ctx.cache.stats.all(
		{id}, 
		start || 0,
		end || unixNow()
	)

	return stats
}

export async function exchanges(ctx){
	let { base, quote, format, start, end } = ctx.parameters
	let baseId = base.currency !== 'XRP'
		? ctx.cache.tokens.get(base)?.id
		: null
	let quoteId = quote.currency !== 'XRP'
		? ctx.cache.tokens.get(quote)?.id
		: null

	if(baseId === undefined || quoteId === undefined)
		throw {message: 'symbol not listed', expose: true}


	if(format === 'raw'){
		return ctx.cache.trades.all(
			{
				base: baseId, 
				quote: quoteId
			},
			start,
			end
		)
	}else{
		if(!ctx.config.exchanges.candleIntervals[format]){
			throw {
				message: `format not available - available formats: raw, ${Object.keys(ctx.config.exchanges.candleIntervals).join(', ')}`, 
				expose: true
			}
		}

		return ctx.cache.candles.all(
			{
				base: baseId, 
				quote: quoteId, 
				interval: ctx.config.exchanges.candleIntervals[format]
			},
			start,
			end
		)
	}
}