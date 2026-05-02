import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "all";

  // TODO: wire real data from Helius/Jupiter price API
  
  const tokens = {
    all: [
      { symbol: "SOL", name: "Solana", price: 142.45, change24h: 3.2, volume24h: "2.4B", logoUri: "" },
      { symbol: "JUP", name: "Jupiter", price: 1.12, change24h: -2.5, volume24h: "142M", logoUri: "" },
      { symbol: "PYTH", name: "Pyth Network", price: 0.45, change24h: 1.2, volume24h: "85M", logoUri: "" },
      { symbol: "BONK", name: "Bonk", price: 0.000024, change24h: 12.5, volume24h: "420M", logoUri: "" },
      { symbol: "WIF", name: "dogwifhat", price: 2.85, change24h: 8.4, volume24h: "310M", logoUri: "" },
      { symbol: "JTO", name: "Jito", price: 3.42, change24h: -1.8, volume24h: "62M", logoUri: "" },
      { symbol: "DRIFT", name: "Drift", price: 0.54, change24h: 4.2, volume24h: "12M", logoUri: "" },
      { symbol: "RENDER", name: "Render", price: 10.24, change24h: -3.5, volume24h: "185M", logoUri: "" },
      { symbol: "HNT", name: "Helium", price: 4.12, change24h: 0.8, volume24h: "15M", logoUri: "" },
      { symbol: "MSOL", name: "Marinade SOL", price: 168.45, change24h: 3.1, volume24h: "24M", logoUri: "" },
    ],
    defi: [
      { symbol: "JUP", name: "Jupiter", price: 1.12, change24h: -2.5, volume24h: "142M", logoUri: "" },
      { symbol: "JTO", name: "Jito", price: 3.42, change24h: -1.8, volume24h: "62M", logoUri: "" },
      { symbol: "DRIFT", name: "Drift", price: 0.54, change24h: 4.2, volume24h: "12M", logoUri: "" },
      { symbol: "RAY", name: "Raydium", price: 1.85, change24h: 5.4, volume24h: "45M", logoUri: "" },
      { symbol: "ORCA", name: "Orca", price: 2.12, change24h: 1.2, volume24h: "18M", logoUri: "" },
      { symbol: "KMNO", name: "Kamino", price: 0.084, change24h: -0.5, volume24h: "8M", logoUri: "" },
      { symbol: "MET", name: "Meteora", price: 0.12, change24h: 2.4, volume24h: "5M", logoUri: "" },
      { symbol: "PYTH", name: "Pyth Network", price: 0.45, change24h: 1.2, volume24h: "85M", logoUri: "" },
      { symbol: "SOL", name: "Solana", price: 142.45, change24h: 3.2, volume24h: "2.4B", logoUri: "" },
      { symbol: "ZBC", name: "Zebec", price: 0.012, change24h: -4.2, volume24h: "2M", logoUri: "" },
    ],
    meme: [
      { symbol: "BONK", name: "Bonk", price: 0.000024, change24h: 12.5, volume24h: "420M", logoUri: "" },
      { symbol: "WIF", name: "dogwifhat", price: 2.85, change24h: 8.4, volume24h: "310M", logoUri: "" },
      { symbol: "POPCAT", name: "Popcat", price: 0.65, change24h: 15.2, volume24h: "85M", logoUri: "" },
      { symbol: "BOME", name: "BOOK OF MEME", price: 0.012, change24h: -5.4, volume24h: "120M", logoUri: "" },
      { symbol: "MEW", name: "cat in a dogs world", price: 0.0042, change24h: 4.8, volume24h: "45M", logoUri: "" },
      { symbol: "TREMP", name: "Doland Tremp", price: 0.85, change24h: -12.4, volume24h: "12M", logoUri: "" },
      { symbol: "BODEN", name: "Joe Boden", price: 0.42, change24h: -8.2, volume24h: "8M", logoUri: "" },
      { symbol: "SLERF", name: "Slerf", price: 0.32, change24h: -2.5, volume24h: "15M", logoUri: "" },
      { symbol: "MYRO", name: "Myro", price: 0.15, change24h: 1.2, volume24h: "10M", logoUri: "" },
      { symbol: "WEN", name: "Wen", price: 0.00024, change24h: 3.5, volume24h: "18M", logoUri: "" },
    ],
    lst: [
      { symbol: "MSOL", name: "Marinade SOL", price: 168.45, change24h: 3.1, volume24h: "24M", logoUri: "" },
      { symbol: "JITOSOL", name: "Jito Staked SOL", price: 164.12, change24h: 3.2, volume24h: "45M", logoUri: "" },
      { symbol: "BSOL", name: "BlazeStake Staked SOL", price: 165.24, change24h: 3.0, volume24h: "12M", logoUri: "" },
      { symbol: "SCNSOL", name: "Socean Staked SOL", price: 162.85, change24h: 2.8, volume24h: "2M", logoUri: "" },
      { symbol: "LAINESOL", name: "Laine Staked SOL", price: 163.42, change24h: 3.1, volume24h: "1M", logoUri: "" },
      { symbol: "COGENTSOL", name: "Cogent Staked SOL", price: 163.12, change24h: 3.1, volume24h: "0.5M", logoUri: "" },
      { symbol: "JSOL", name: "JPool Staked SOL", price: 164.55, change24h: 2.9, volume24h: "1.5M", logoUri: "" },
      { symbol: "DAOSOL", name: "monkeDAO Staked SOL", price: 166.12, change24h: 3.2, volume24h: "0.8M", logoUri: "" },
      { symbol: "STEAK", name: "Steak SOL", price: 162.12, change24h: 2.7, volume24h: "0.2M", logoUri: "" },
      { symbol: "SOL", name: "Solana", price: 142.45, change24h: 3.2, volume24h: "2.4B", logoUri: "" },
    ],
    stables: [
      { symbol: "USDC", name: "USD Coin", price: 1.00, change24h: 0.01, volume24h: "1.2B", logoUri: "" },
      { symbol: "USDT", name: "Tether", price: 1.00, change24h: -0.01, volume24h: "850M", logoUri: "" },
      { symbol: "USDG", name: "Gate USD", price: 1.00, change24h: 0.05, volume24h: "15M", logoUri: "" },
      { symbol: "DAI", name: "Dai", price: 1.00, change24h: 0.02, volume24h: "8M", logoUri: "" },
      { symbol: "USDS", name: "Sperax USD", price: 0.99, change24h: -0.12, volume24h: "2M", logoUri: "" },
      { symbol: "PYUSD", name: "PayPal USD", price: 1.00, change24h: 0.0, volume24h: "45M", logoUri: "" },
      { symbol: "UXD", name: "UXD Stablecoin", price: 1.00, change24h: 0.0, volume24h: "1M", logoUri: "" },
      { symbol: "PAXG", name: "PAX Gold", price: 2342.12, change24h: 1.2, volume24h: "12M", logoUri: "" },
      { symbol: "EURC", name: "Euro Coin", price: 1.08, change24h: -0.2, volume24h: "5M", logoUri: "" },
      { symbol: "ZBC", name: "Zebec", price: 0.012, change24h: -4.2, volume24h: "2M", logoUri: "" },
    ],
    gaming: [
      { symbol: "ATLAS", name: "Star Atlas", price: 0.0032, change24h: -2.5, volume24h: "1.2M", logoUri: "" },
      { symbol: "POLIS", name: "Star Atlas DAO", price: 0.18, change24h: -4.2, volume24h: "0.8M", logoUri: "" },
      { symbol: "AURORY", name: "Aurory", price: 0.45, change24h: 1.2, volume24h: "0.5M", logoUri: "" },
      { symbol: "SHDW", name: "Shadow Token", price: 0.85, change24h: -1.5, volume24h: "2.4M", logoUri: "" },
      { symbol: "HONEY", name: "Hivemapper", price: 0.065, change24h: 8.4, volume24h: "4.2M", logoUri: "" },
      { symbol: "NOS", name: "Nosana", price: 2.45, change24h: 12.5, volume24h: "18M", logoUri: "" },
      { symbol: "STEP", name: "Step Finance", price: 0.042, change24h: -0.8, volume24h: "0.3M", logoUri: "" },
      { symbol: "GENE", name: "Genopets", price: 0.12, change24h: -2.1, volume24h: "0.1M", logoUri: "" },
      { symbol: "CROWN", name: "PhotoFinish", price: 0.54, change24h: 4.2, volume24h: "1.2M", logoUri: "" },
      { symbol: "RENDER", name: "Render", price: 10.24, change24h: -3.5, volume24h: "185M", logoUri: "" },
    ],
  };

  return NextResponse.json(tokens[category as keyof typeof tokens] || tokens.all);
}
