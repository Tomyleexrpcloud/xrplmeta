import Decimal from 'decimal.js'


export function deriveExchanges(tx){
	let hash = tx.hash || tx.transaction.hash
	let maker = tx.Account || tx.transaction.Account
	let exchanges = []

	for(let affected of (tx.meta || tx.metaData).AffectedNodes){
		let node = affected.ModifiedNode || affected.DeletedNode

		if(!node || node.LedgerEntryType !== 'Offer')
			continue

		if(!node.PreviousFields || !node.PreviousFields.TakerPays || !node.PreviousFields.TakerGets)
			continue

		let taker = node.FinalFields.Account
		let sequence = node.FinalFields.Sequence
		let previousTakerPays = fromLedgerAmount(node.PreviousFields.TakerPays)
		let previousTakerGets = fromLedgerAmount(node.PreviousFields.TakerGets)
		let finalTakerPays = fromLedgerAmount(node.FinalFields.TakerPays)
		let finalTakerGets = fromLedgerAmount(node.FinalFields.TakerGets)

		let takerPaid = {
			...finalTakerPays, 
			value: previousTakerPays.value.minus(finalTakerPays.value)
		}

		let takerGot = {
			...finalTakerGets, 
			value: previousTakerGets.value.minus(finalTakerGets.value)
		}

		exchanges.push({
			hash,
			maker,
			taker,
			sequence,
			base: {
				currency: currencyHexToUTF8(takerPaid.currency), 
				issuer: takerPaid.issuer
			},
			quote: {
				currency: currencyHexToUTF8(takerGot.currency), 
				issuer: takerGot.issuer
			},
			price: takerGot.value.div(takerPaid.value),
			volume: takerPaid.value
		})
	}

	return exchanges
}

export function deriveBalanceChanges(tx){
	let parties = {}
	let bookChange = ({currency, issuer, account, previous, final}) => {
		let party = parties[account]

		if(!party)
			party = parties[account] = []

		if(party.some(e => e.currency === currency && e.issuer === issuer))
			throw 'no way'

		party.push({
			currency,
			issuer,
			previous,
			final,
			change: Decimal.sub(final, previous)
		})
	}

	for(let affected of (tx.meta || tx.metaData).AffectedNodes){
		let key = Object.keys(affected)[0]
		let node = affected[key]
		let finalFields = node.FinalFields || node.NewFields
		let previousFields = node.PreviousFields

		if(node.LedgerEntryType === 'RippleState'){
			let currency = finalFields.Balance.currency
			let final = new Decimal(finalFields?.Balance?.value || '0')
			let previous = new Decimal(previousFields?.Balance?.value || '0')
			let issuer
			let account

			if(finalFields.HighLimit.value === '0'){
				issuer = finalFields.HighLimit.issuer
				account = finalFields.LowLimit.issuer
			}else if(finalFields.LowLimit.value === '0'){
				issuer = finalFields.LowLimit.issuer
				account = finalFields.HighLimit.issuer
				final = final.times(-1)
				previous = previous.times(-1)
			}else{
				//ಠ_ಠ
			}

			bookChange({
				currency, 
				issuer, 
				account, 
				previous,
				final
			})
		}else if(node.LedgerEntryType === 'AccountRoot'){
			if(!finalFields)
				continue

			let account = finalFields.Account
			let final = new Decimal(finalFields?.Balance || '0')
				.div('1000000')
			let previous = new Decimal(previousFields?.Balance || '0')
				.div('1000000')


			bookChange({
				currency: 'XRP',
				issuer: null, 
				account, 
				previous,
				final
			})
		}
	}

	return parties
}


export function currencyHexToUTF8(code){
	if(code.length === 3)
		return code

	let decoded = new TextDecoder()
		.decode(hexToBytes(code))
	let padNull = decoded.length

	while(decoded.charAt(padNull-1) === '\0')
		padNull--

	return decoded.slice(0, padNull)
}

function hexToBytes(hex){
	let bytes = new Uint8Array(hex.length / 2)

	for (let i = 0; i !== bytes.length; i++){
		bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
	}

	return bytes
}

export function currencyUTF8ToHex(code){
	if(/^[a-zA-Z0-9\?\!\@\#\$\%\^\&\*\<\>\(\)\{\}\[\]\|\]\{\}]{3}$/.test(code))
		return code

	if(/^[A-Z0-9]{40}$/.test(code))
		return code

	let hex = ''

	for(let i=0; i<code.length; i++){
		hex += code.charCodeAt(i).toString(16)
	}

	return hex
		.toUpperCase()
		.padEnd(40, '0')
}


export function fromLedgerAmount(amount){
	if(typeof amount === 'string')
		return {
			currency: 'XRP',
			value: Decimal.div(amount, '1000000')
		}
	
	return {
		currency: amount.currency,
		issuer: amount.issuer,
		value: new Decimal(amount.value)
	}
}


export function toLedgerAmount(amount){
	if(amount.currency === 'XRP')
		return amount.value.times(1000000).toString()

	return {
		currency: amount.currency,
		issuer: amount.issuer,
		value: amount.value.toString()
	}
}