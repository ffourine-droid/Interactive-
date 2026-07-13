console.log("Environment variables keys:");
console.log(Object.keys(process.env).filter(k => k.includes("SUPABASE") || k.includes("KEY") || k.includes("SECRET") || k.includes("DB") || k.includes("POSTGRES")));
