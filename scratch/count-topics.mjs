async function countTopics() {
  const baseUrl = "https://qbyowsxgphyecgucthon.supabase.co/rest/v1/valgløfte";
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFieW93c3hncGh5ZWNndWN0aG9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5Nzk1NDIsImV4cCI6MjA4NDU1NTU0Mn0.WVLQEBFR2CKDFBACdOBUHHzOK1bdYXrbOIZ-i2YM-UE";
  
  // Count for 'arbeid'
  const resArbeid = await fetch(`${baseUrl}?select=count&tekst=fts(norwegian).arbeid`, {
    headers: { "apikey": anonKey, "Authorization": `Bearer ${anonKey}` }
  });
  const dataArbeid = await resArbeid.json();
  console.log("Count for 'arbeid':", dataArbeid);
  
  // Count for 'jobb'
  const resJobb = await fetch(`${baseUrl}?select=count&tekst=fts(norwegian).jobb`, {
    headers: { "apikey": anonKey, "Authorization": `Bearer ${anonKey}` }
  });
  const dataJobb = await resJobb.json();
  console.log("Count for 'jobb':", dataJobb);
  
  // Count for 'arbeidsplass'
  const resArbPl = await fetch(`${baseUrl}?select=count&tekst=fts(norwegian).arbeidsplass`, {
    headers: { "apikey": anonKey, "Authorization": `Bearer ${anonKey}` }
  });
  const dataArbPl = await resArbPl.json();
  console.log("Count for 'arbeidsplass':", dataArbPl);
}

countTopics().catch(console.error);
