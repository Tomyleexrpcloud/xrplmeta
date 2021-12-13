import { keySort, mapMultiKey, nestDotNotated } from '@xrplmeta/common/lib/data.js'
import { createURI as createPairURI } from '@xrplmeta/common/lib/pair.js'
import { wait } from '@xrplmeta/common/lib/time.js'
import Decimal from '@xrplmeta/common/lib/decimal.js'
import { log } from '@xrplmeta/common/lib/log.js'


export function init(){
	this.exec(
		`CREATE TABLE IF NOT EXISTS "Currencies" (
			"currency"		INTEGER NOT NULL UNIQUE,
			"stats"			TEXT NOT NULL,
			"marketcap"		REAL NOT NULL,
			"volume"		REAL NOT NULL
		);
		
		CREATE INDEX IF NOT EXISTS 
		"CurrenciesMarketcap" ON "Currencies" 
		("marketcap");

		CREATE INDEX IF NOT EXISTS 
		"CurrenciesVolume" ON "Currencies" 
		("volume");`
	)
}


export function insert(data){
	this.insert({
		table: 'Currencies',
		data: {
			...data,
			marketcap: data.marketcap.toNumber(),
			volume: data.volume.toNumber()
		},
		duplicate: 'update'
	})
}