
import { AnalystTarget, TickerFundamentals } from './types';

export const LATEST_PRICES: Record<string, number> = {
    "ADH": 32.15,
    "ADI": 510,
    "AFI": 338,
    "AFM": 1226,
    "AGM": 6699,
    "AKT": 1180,
    "ALM": 1789,
    "ARD": 450,
    "ATH": 93.5,
    "ATL": 141,
    "ATW": 739.9,
    "BAL": 225,
    "BCI": 601,
    "BCP": 279,
    "BOA": 214,
    "CAP": 300,
    "CDM": 1070,
    "CFG": 231,
    "CIH": 399.9,
    "CMA": 1740,
    "CMG": 386,
    "CMT": 2860,
    "COL": 85,
    "CRS": 32,
    "CSR": 211,
    "CTM": 895,
    "DHO": 72.1,
    "DWY": 889,
    "DYT": 330,
    "EQD": 1380,
    "FBR": 390,
    "GAZ": 4200,
    "GTM": 860,
    "HPS": 540,
    "IAM": 108.9,
    "IBC": 68,
    "IMO": 91.4,
    "INV": 181.85,
    "JET": 2735,
    "LBV": 4300,
    "LES": 343.5,
    "LHM": 1811,
    "M2M": 469.75,
    "MAB": 900.8,
    "MDP": 25.76,
    "MIC": 801,
    "MLE": 377.9,
    "MNG": 8700,
    "MOX": 400,
    "MSA": 949,
    "MUT": 249.1,
    "NKL": 51.5,
    "OUL": 1186,
    "PRO": 1444,
    "RDS": 163.8,
    "REB": 107.1,
    "RIS": 378.95,
    "S2M": 579.9,
    "SAH": 2153,
    "SBM": 2220,
    "SID": 2169,
    "SLF": 584,
    "SMI": 7350,
    "SNA": 96,
    "SNP": 470,
    "SOT": 1799,
    "SRM": 454,
    "STR": 236.25,
    "TGC": 864,
    "TMA": 1636,
    "TQM": 2105,
    "UMR": 165,
    "VCN": 440,
    "WAA": 4558,
    "ZDJ": 233
};

export const TICKER_FUNDAMENTALS: TickerFundamentals[] = [
    {
        "ticker": "ADH",
        "price": 32.15,
        "marketCap": 13280166051,
        "peRatio": 36.78068870838577,
        "dividendYield": 1.5156107,
        "changePercent": -2.5462261291300496,
        "volume": 40666
    },
    {
        "ticker": "ADI",
        "price": 510,
        "marketCap": 11480866013,
        "peRatio": 32.396790812016036,
        "dividendYield": 0.69230765,
        "changePercent": -1.9230769230769231,
        "volume": 9512
    },
    {
        "ticker": "AFI",
        "price": 338,
        "marketCap": 100276001,
        "peRatio": 9.173465344384917,
        "dividendYield": 6.395349,
        "changePercent": -1.744186046511628,
        "volume": 1964
    },
    {
        "ticker": "AFM",
        "price": 1226,
        "marketCap": 1226000000,
        "peRatio": 15.844583504573736,
        "dividendYield": 4.8939643,
        "changePercent": 0,
        "volume": 5
    },
    {
        "ticker": "AGM",
        "price": 6699,
        "marketCap": 1339800020,
        "peRatio": null,
        "dividendYield": 4.47828,
        "changePercent": 0,
        "volume": 1
    },
    {
        "ticker": "AKT",
        "price": 1180,
        "marketCap": 17274232960,
        "peRatio": 39.82047042148956,
        "dividendYield": 0.8196721,
        "changePercent": -3.278688524590164,
        "volume": 12129
    },
    {
        "ticker": "ALM",
        "price": 1789,
        "marketCap": 828932176,
        "peRatio": 18.592711532365765,
        "dividendYield": 5.6211357,
        "changePercent": 0.5621135469364812,
        "volume": 28
    },
    {
        "ticker": "ARD",
        "price": 450,
        "marketCap": 5529976997,
        "peRatio": 17.668815718178465,
        "dividendYield": 5,
        "changePercent": 2.272727272727273,
        "volume": 15246
    },
    {
        "ticker": "ATH",
        "price": 93.5,
        "marketCap": 4762891739,
        "peRatio": null,
        "dividendYield": 2.1119325,
        "changePercent": -1.2671594508975743,
        "volume": 627
    },
    {
        "ticker": "ATL",
        "price": 141,
        "marketCap": 8620553688,
        "peRatio": 17.72559273879265,
        "dividendYield": 4.055944,
        "changePercent": -1.3986013986013985,
        "volume": 171659
    },
    {
        "ticker": "ATW",
        "price": 739.9,
        "marketCap": 149416541748,
        "peRatio": 14.097495451037926,
        "dividendYield": 2.5675676,
        "changePercent": -0.013513513513516588,
        "volume": 30015
    },
    {
        "ticker": "BAL",
        "price": 225,
        "marketCap": 392399991,
        "peRatio": 25.202742058335946,
        "dividendYield": 2.4444444,
        "changePercent": 0,
        "volume": 20
    },
    {
        "ticker": "BCI",
        "price": 601,
        "marketCap": 8047247549,
        "peRatio": 23.635269642639443,
        "dividendYield": 2.970297,
        "changePercent": -0.825082508250825,
        "volume": 1
    },
    {
        "ticker": "BCP",
        "price": 279,
        "marketCap": 56927491455,
        "peRatio": 12.603504587404625,
        "dividendYield": 3.7500002,
        "changePercent": -0.35714285714285715,
        "volume": 13085
    },
    {
        "ticker": "BOA",
        "price": 214,
        "marketCap": 47096265678,
        "peRatio": 12.570341043925705,
        "dividendYield": 2.3386343,
        "changePercent": 0.09354536950420422,
        "volume": 8968
    },
    {
        "ticker": "CAP",
        "price": 300,
        "marketCap": null,
        "peRatio": 4.849127480328707,
        "dividendYield": null,
        "changePercent": 0.33444816053511706,
        "volume": 19803
    },
    {
        "ticker": "CDM",
        "price": 1070,
        "marketCap": 11534086990,
        "peRatio": 13.608660704292705,
        "dividendYield": 3.9339623,
        "changePercent": 0.9433962264150944,
        "volume": 177
    },
    {
        "ticker": "CFG",
        "price": 231,
        "marketCap": 8226870899,
        "peRatio": 24.250695501548478,
        "dividendYield": 1.4042553,
        "changePercent": -1.702127659574468,
        "volume": 20602
    },
    {
        "ticker": "CIH",
        "price": 399.9,
        "marketCap": 14242250061,
        "peRatio": 12.120458995326393,
        "dividendYield": 3.5,
        "changePercent": -0.02500000000000568,
        "volume": 1582
    },
    {
        "ticker": "CMA",
        "price": 1740,
        "marketCap": 25190826430,
        "peRatio": 23.21064594960889,
        "dividendYield": 3.4383953,
        "changePercent": -0.28653295128939826,
        "volume": 2651
    },
    {
        "ticker": "CMG",
        "price": 386,
        "marketCap": 6562347504,
        "peRatio": null,
        "dividendYield": 1.6321244,
        "changePercent": 0,
        "volume": 100749
    },
    {
        "ticker": "CMT",
        "price": 2860,
        "marketCap": 4621709650,
        "peRatio": null,
        "dividendYield": null,
        "changePercent": 4.0378319388868675,
        "volume": 4677
    },
    {
        "ticker": "COL",
        "price": 85,
        "marketCap": 1369996929,
        "peRatio": 26.68340919792811,
        "dividendYield": 3.0588233,
        "changePercent": 0,
        "volume": 1131
    },
    {
        "ticker": "CRS",
        "price": 32,
        "marketCap": 172112838,
        "peRatio": 56.318197817669834,
        "dividendYield": null,
        "changePercent": -2.110737228510241,
        "volume": 1135
    },
    {
        "ticker": "CSR",
        "price": 211,
        "marketCap": 19653324463,
        "peRatio": 24.130556603881477,
        "dividendYield": 4.8076925,
        "changePercent": 1.4423076923076923,
        "volume": 12878
    },
    {
        "ticker": "CTM",
        "price": 895,
        "marketCap": 1097250325,
        "peRatio": 23.53201010693261,
        "dividendYield": 2.793296,
        "changePercent": 0,
        "volume": 224
    },
    {
        "ticker": "DHO",
        "price": 72.1,
        "marketCap": 6350999889,
        "peRatio": 22.686510808344604,
        "dividendYield": 3.1034482,
        "changePercent": -0.5517241379310424,
        "volume": 372244
    },
    {
        "ticker": "DWY",
        "price": 889,
        "marketCap": 1676442397,
        "peRatio": 17.783200976175713,
        "dividendYield": 4.499438,
        "changePercent": 0.33860045146726864,
        "volume": 1
    },
    {
        "ticker": "DYT",
        "price": 330,
        "marketCap": 335364959,
        "peRatio": 15.09634211056012,
        "dividendYield": 4.910714,
        "changePercent": -1.7857142857142856,
        "volume": 252
    },
    {
        "ticker": "EQD",
        "price": 1380,
        "marketCap": 2311626081,
        "peRatio": null,
        "dividendYield": null,
        "changePercent": -0.2890173410404624,
        "volume": 1095
    },
    {
        "ticker": "FBR",
        "price": 390,
        "marketCap": 562642758,
        "peRatio": null,
        "dividendYield": null,
        "changePercent": -0.2557544757033248,
        "volume": 289
    },
    {
        "ticker": "GAZ",
        "price": 4200,
        "marketCap": 14265625000,
        "peRatio": 18.9273765574527,
        "dividendYield": 4.2168674,
        "changePercent": 1.2048192771084338,
        "volume": 15
    },
    {
        "ticker": "GTM",
        "price": 860,
        "marketCap": null,
        "peRatio": null,
        "dividendYield": null,
        "changePercent": -2.383654937570942,
        "volume": 36050
    },
    {
        "ticker": "HPS",
        "price": 540,
        "marketCap": 3999342556,
        "peRatio": null,
        "dividendYield": 1.2962962,
        "changePercent": 0,
        "volume": 471
    },
    {
        "ticker": "IAM",
        "price": 108.9,
        "marketCap": 94942302979,
        "peRatio": 13.550337825226773,
        "dividendYield": 1.3240741,
        "changePercent": 0.8333333333333385,
        "volume": 129147
    },
    {
        "ticker": "IBC",
        "price": 68,
        "marketCap": 28752261,
        "peRatio": null,
        "dividendYield": null,
        "changePercent": -1.2632496006969718,
        "volume": 60
    },
    {
        "ticker": "IMO",
        "price": 91.4,
        "marketCap": 823690120,
        "peRatio": 15.825469656306813,
        "dividendYield": 5.6861672,
        "changePercent": -0.05467468562055457,
        "volume": 1319
    },
    {
        "ticker": "INV",
        "price": 181.85,
        "marketCap": 72716040,
        "peRatio": 35.022340343579074,
        "dividendYield": null,
        "changePercent": -4.289473684210529,
        "volume": 975
    },
    {
        "ticker": "JET",
        "price": 2735,
        "marketCap": 8119118805,
        "peRatio": 49.7432810195281,
        "dividendYield": 0.5597015,
        "changePercent": 2.0522388059701493,
        "volume": 2746
    },
    {
        "ticker": "LBV",
        "price": 4300,
        "marketCap": 12904154879,
        "peRatio": 22.52568451888281,
        "dividendYield": 2.479704,
        "changePercent": -3.5658219331688716,
        "volume": 4196
    },
    {
        "ticker": "LES",
        "price": 343.5,
        "marketCap": 9397476645,
        "peRatio": null,
        "dividendYield": 0.8820935,
        "changePercent": 0.9997059688326895,
        "volume": 57
    },
    {
        "ticker": "LHM",
        "price": 1811,
        "marketCap": 42644856949,
        "peRatio": 21.31014438181754,
        "dividendYield": 3.846154,
        "changePercent": -0.49450549450549447,
        "volume": 2656
    },
    {
        "ticker": "M2M",
        "price": 469.75,
        "marketCap": 304293228,
        "peRatio": 38.068186422684505,
        "dividendYield": null,
        "changePercent": 0,
        "volume": 3
    },
    {
        "ticker": "MAB",
        "price": 900.8,
        "marketCap": 1246732723,
        "peRatio": 8.94943489802731,
        "dividendYield": 5.884312,
        "changePercent": 0.011102475852104924,
        "volume": 1
    },
    {
        "ticker": "MDP",
        "price": 25.76,
        "marketCap": 126053738,
        "peRatio": 21.19466842191871,
        "dividendYield": null,
        "changePercent": -2.2390891840607203,
        "volume": 676
    },
    {
        "ticker": "MIC",
        "price": 801,
        "marketCap": 1399439956,
        "peRatio": 24.13682960784432,
        "dividendYield": 4.801921,
        "changePercent": -3.8415366146458583,
        "volume": 1005
    },
    {
        "ticker": "MLE",
        "price": 377.9,
        "marketCap": 1049618292.0000001,
        "peRatio": 9.07035465350717,
        "dividendYield": 3.7037036,
        "changePercent": -0.02645502645503247,
        "volume": 5
    },
    {
        "ticker": "MNG",
        "price": 8700,
        "marketCap": 97883573055,
        "peRatio": 139.1759503957716,
        "dividendYield": 0.4848485,
        "changePercent": 5.454545454545454,
        "volume": 1212
    },
    {
        "ticker": "MOX",
        "price": 400,
        "marketCap": 332231245,
        "peRatio": 24.015369836695488,
        "dividendYield": 0.9782343,
        "changePercent": -2.1765712888236677,
        "volume": 6
    },
    {
        "ticker": "MSA",
        "price": 949,
        "marketCap": 68991863403,
        "peRatio": 49.264152412593766,
        "dividendYield": 1.0106382,
        "changePercent": 0.9574468085106382,
        "volume": 14107
    },
    {
        "ticker": "MUT",
        "price": 249.1,
        "marketCap": 2311684370,
        "peRatio": 19.11228756665516,
        "dividendYield": 4.2,
        "changePercent": -0.36000000000000226,
        "volume": 1867
    },
    {
        "ticker": "NKL",
        "price": 51.5,
        "marketCap": 3005182058.2726207,
        "peRatio": 8.809843890397268,
        "dividendYield": 4.666667,
        "changePercent": 0.9803921568627451,
        "volume": 1448
    },
    {
        "ticker": "OUL",
        "price": 1186,
        "marketCap": 2348280023,
        "peRatio": 35.65941351389545,
        "dividendYield": 1.9392917,
        "changePercent": 0,
        "volume": 8
    },
    {
        "ticker": "PRO",
        "price": 1444,
        "marketCap": 1444000000,
        "peRatio": 25.246785580658585,
        "dividendYield": null,
        "changePercent": -0.6877579092159559,
        "volume": 17
    },
    {
        "ticker": "RDS",
        "price": 163.8,
        "marketCap": 4376877775,
        "peRatio": null,
        "dividendYield": null,
        "changePercent": -1.9161676646706518,
        "volume": 114527
    },
    {
        "ticker": "REB",
        "price": 107.1,
        "marketCap": 18527879,
        "peRatio": null,
        "dividendYield": null,
        "changePercent": 1.9999999999999944,
        "volume": 10
    },
    {
        "ticker": "RIS",
        "price": 378.95,
        "marketCap": 5458566888,
        "peRatio": 24.127107421178625,
        "dividendYield": 1.8372704,
        "changePercent": -0.5380577427821551,
        "volume": 22824
    },
    {
        "ticker": "S2M",
        "price": 579.9,
        "marketCap": 471000607,
        "peRatio": 13.935984350555252,
        "dividendYield": null,
        "changePercent": -0.017241379310348748,
        "volume": 94
    },
    {
        "ticker": "SAH",
        "price": 2153,
        "marketCap": 8863630191,
        "peRatio": 5.983969742736551,
        "dividendYield": 3.7621922,
        "changePercent": 0.13953488372093023,
        "volume": 53
    },
    {
        "ticker": "SBM",
        "price": 2220,
        "marketCap": 6284659368,
        "peRatio": 27.559871337609664,
        "dividendYield": 4.502476,
        "changePercent": -0.04502476361999099,
        "volume": 3
    },
    {
        "ticker": "SID",
        "price": 2169,
        "marketCap": 8346000204,
        "peRatio": 38.99606263821219,
        "dividendYield": 1.8224299,
        "changePercent": 1.355140186915888,
        "volume": 69
    },
    {
        "ticker": "SLF",
        "price": 584,
        "marketCap": 1824485382,
        "peRatio": 18.586650711003042,
        "dividendYield": 5.05137,
        "changePercent": -0.17094017094017094,
        "volume": 15
    },
    {
        "ticker": "SMI",
        "price": 7350,
        "marketCap": 11601174567,
        "peRatio": 67.6920866569227,
        "dividendYield": 1.1344299,
        "changePercent": 4.2257515598411794,
        "volume": 2947
    },
    {
        "ticker": "SNA",
        "price": 96,
        "marketCap": 1668652734,
        "peRatio": 25.423728813559322,
        "dividendYield": null,
        "changePercent": 1.8027571580063655,
        "volume": 58153
    },
    {
        "ticker": "SNP",
        "price": 470,
        "marketCap": 1120800045,
        "peRatio": null,
        "dividendYield": null,
        "changePercent": 0.6423982869379015,
        "volume": 183
    },
    {
        "ticker": "SOT",
        "price": 1799,
        "marketCap": 13654076898,
        "peRatio": 38.18843733084263,
        "dividendYield": 1.5598886,
        "changePercent": 0.22284122562674097,
        "volume": 5195
    },
    {
        "ticker": "SRM",
        "price": 454,
        "marketCap": 155199997,
        "peRatio": null,
        "dividendYield": null,
        "changePercent": -6.391752577319587,
        "volume": 222
    },
    {
        "ticker": "STR",
        "price": 236.25,
        "marketCap": 308945035,
        "peRatio": 28.72445195569443,
        "dividendYield": null,
        "changePercent": -4.526166902404522,
        "volume": 2863
    },
    {
        "ticker": "TGC",
        "price": 864,
        "marketCap": 30686783524,
        "peRatio": 40.26414021614014,
        "dividendYield": 1.299435,
        "changePercent": -2.3728813559322033,
        "volume": 5397
    },
    {
        "ticker": "TMA",
        "price": 1636,
        "marketCap": 14336000061,
        "peRatio": 17.24270584007074,
        "dividendYield": 7.0625,
        "changePercent": 2.25,
        "volume": 139
    },
    {
        "ticker": "TQM",
        "price": 2105,
        "marketCap": 49535940170,
        "peRatio": 51.52683434306346,
        "dividendYield": 1.7619047,
        "changePercent": 0.2380952380952381,
        "volume": 12066
    },
    {
        "ticker": "UMR",
        "price": 165,
        "marketCap": 1883290257,
        "peRatio": null,
        "dividendYield": null,
        "changePercent": 0,
        "volume": 3
    },
    {
        "ticker": "VCN",
        "price": 440,
        "marketCap": 4513893623,
        "peRatio": null,
        "dividendYield": null,
        "changePercent": 0,
        "volume": 8218
    },
    {
        "ticker": "WAA",
        "price": 4558,
        "marketCap": 17146500000,
        "peRatio": 17.659137577002053,
        "dividendYield": 2.857726,
        "changePercent": -6.960604204939784,
        "volume": 76
    },
    {
        "ticker": "ZDJ",
        "price": 233,
        "marketCap": 135793851,
        "peRatio": 13.65463730235938,
        "dividendYield": null,
        "changePercent": -1.708500316388952,
        "volume": 18
    }
];

export const ANALYST_TARGETS: AnalystTarget[] = []; // TradingView targets require different endpoint
