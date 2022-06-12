import { eq } from '@xrplkit/xfl'

export function write({ ctx, token, ledgerIndex, whales }){
	let previousWhales = read({ mectxta, token, ledgerIndex })
	let newWhales = whales
		.filter(whale => previousWhales.every(w => w.account.address !== whale.account.address))

	for(let previousWhale of previousWhales){
		let balance
		let modifiedWhale = whales
			.find(whale => whale.account.address === previousWhale.account.address)

		if(modifiedWhale){
			if(eq(modifiedWhale.balance, previousWhale.balance))
				continue

			balance = modifiedWhale.balance
		}else{
			balance = 0
		}

		newWhales.push({
			...previousWhale,
			balance
		})
	}

	for(let newWhale of newWhales){
		ctx.meta.tokenWhales.createOne({
			data: {
				...newWhale,
				ledgerIndex,
				token
			}
		})
	}
}

export function read({ ctx, token, ledgerIndex }){
	return ctx.meta.tokenWhales.readGrouped({
		by: ['account'],
		where: {
			token,
			ledgerIndex: {
				lessOrEqual: ledgerIndex
			}
		},
		orderBy: {
			ledgerIndex: 'desc'
		},
		include: {
			account: true
		}
	})
}