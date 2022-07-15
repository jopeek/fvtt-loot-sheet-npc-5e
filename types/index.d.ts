// types/package.json
export interface CurrencyRates {
    [key: string]: Conversions
}

export interface Conversion {
        rate: number
        label: string
}

export interface Conversions {
    [key: string]: Conversion
}

export interface CurrencyObject {
    [key: string]: number
}

export interface Currencies {
    'pp': number,
    'gp': number,
    'ep': number,
    'sp': number,
    'cp': number
}

export interface LootSheetActorFlags {
    adjustCurrency: boolean
    generateCurrency: boolean,    
    currencyFormula: string,    
}


