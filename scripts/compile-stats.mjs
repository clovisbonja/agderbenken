import fs from "fs";
import path from "path";
import crypto from "crypto";

const SLEEP_MS = 250; // We can lower sleep time slightly since caching will cover repeat calls

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Set up caching directory
const CACHE_DIR = path.join("/Users/clovisbonja/Documents/agderbenken/scripts", "cache");
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getCacheFilename(url) {
  const hash = crypto.createHash("sha256").update(url).digest("hex");
  return path.join(CACHE_DIR, `${hash}.txt`);
}

// Cache-wrapper for fetch to handle Stortinget API rate-limits
async function fetchCached(url) {
  const cacheFile = getCacheFilename(url);
  if (fs.existsSync(cacheFile)) {
    const data = fs.readFileSync(cacheFile, "utf-8");
    return {
      ok: true,
      status: 200,
      text: async () => data,
      json: async () => JSON.parse(data),
    };
  }

  await sleep(SLEEP_MS);
  console.log(`[Fetch] Calling ${url}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  const text = await res.text();
  fs.writeFileSync(cacheFile, text, "utf-8");
  
  return {
    ok: true,
    status: 200,
    text: async () => text,
    json: async () => JSON.parse(text),
  };
}

function parseStortingetDate(dateStr) {
  if (!dateStr) return "";
  const match = /\/Date\((\d+)/.exec(dateStr);
  if (!match) return "";
  const date = new Date(parseInt(match[1]));
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

async function run() {
  console.log("=== COMPILING AGDERBENKEN REAL DATA ===");

  // 1. Fetch Agder representatives dynamically
  console.log("Fetching representatives and vararepresentanter for 2025-2029...");
  const repsUrl = "https://data.stortinget.no/eksport/representanter?stortingsperiodeid=2025-2029&vararepresentanter=true&format=json";
  const repsRes = await fetchCached(repsUrl);
  const repsData = await repsRes.json();
  const repsList = repsData.representanter_liste || [];

  const AGDER_REPS = {};
  repsList.forEach(r => {
    if (r.fylke && r.fylke.id && (r.fylke.id === "AA" || r.fylke.id === "VA" || r.fylke.id.includes("Agder"))) {
      AGDER_REPS[r.id] = {
        name: `${r.fornavn} ${r.etternavn}`,
        party: r.parti.navn
      };
    }
  });

  console.log(`Found ${Object.keys(AGDER_REPS).length} Agder representatives (main and varas).`);

  const sessions = ["2024-2025", "2025-2026"];
  const allCases = [];
  const allQuestions = [];

  // 2. Fetch all cases
  for (const session of sessions) {
    console.log(`Fetching cases for session ${session}...`);
    try {
      const res = await fetchCached(`https://data.stortinget.no/eksport/saker?sesjonid=${session}&format=json`);
      if (res.ok) {
        const data = await res.json();
        const cases = data.saker_liste || [];
        allCases.push(...cases.map(c => ({ ...c, session })));
        console.log(`  Found ${cases.length} cases.`);
      } else {
        console.error(`  Failed to fetch cases for ${session}: ${res.status}`);
      }
    } catch (e) {
      console.error(`  Error fetching cases for ${session}:`, e);
    }
  }

  // 3. Fetch all written questions
  for (const session of sessions) {
    console.log(`Fetching written questions for session ${session}...`);
    try {
      const res = await fetchCached(`https://data.stortinget.no/eksport/skriftligesporsmal?sesjonid=${session}&format=json`);
      if (res.ok) {
        const data = await res.json();
        const questions = data.sporsmal_liste || [];
        allQuestions.push(...questions.map(q => ({ ...q, session })));
        console.log(`  Found ${questions.length} questions.`);
      } else {
        console.error(`  Failed to fetch questions for ${session}: ${res.status}`);
      }
    } catch (e) {
      console.error(`  Error fetching questions for ${session}:`, e);
    }
  }

  // 4. Process proposals (Dokument 8)
  console.log("Processing representative proposals (Dokument 8)...");
  const proposalsByRep = {};
  for (const repId in AGDER_REPS) {
    proposalsByRep[repId] = [];
  }

  const statusMapping = {
    1: { no: "Behandlet", en: "Processed" },
    2: { no: "Til behandling", en: "Pending" },
    3: { no: "Behandlet", en: "Processed" },
    4: { no: "Trukket", en: "Withdrawn" },
    5: { no: "Avvist", en: "Rejected" },
    6: { no: "Bortfalt", en: "Lapsed" },
    7: { no: "Trukket", en: "Withdrawn" },
  };

  allCases.forEach(c => {
    if (c.forslagstiller_liste && c.forslagstiller_liste.length > 0) {
      c.forslagstiller_liste.forEach(proposer => {
        if (AGDER_REPS[proposer.id]) {
          const statusInfo = statusMapping[c.status] || { no: "Ukjent", en: "Unknown" };
          const ref = c.henvisning || `Sak ${c.id}`;
          
          if (!proposalsByRep[proposer.id].some(p => p.id === ref)) {
            proposalsByRep[proposer.id].push({
              id: ref,
              title: c.korttittel || c.tittel,
              statusNo: statusInfo.no,
              statusEn: statusInfo.en,
              statusType: (c.status === 1 || c.status === 3) ? "success" : (c.status === 2 ? "warning" : "danger"),
              session: c.session
            });
          }
        }
      });
    }
  });

  // 5. Process written questions (Statements)
  console.log("Processing written questions (statements)...");
  const questionsByRep = {};
  for (const repId in AGDER_REPS) {
    questionsByRep[repId] = [];
  }

  allQuestions.forEach(q => {
    if (q.sporsmal_fra && AGDER_REPS[q.sporsmal_fra.id]) {
      const repId = q.sporsmal_fra.id;
      const dateStr = parseStortingetDate(q.sendt_dato || q.datert_dato);
      
      questionsByRep[repId].push({
        topic: q.sporsmal_til_minister_tittel ? (q.sporsmal_til_minister_tittel.charAt(0).toUpperCase() + q.sporsmal_til_minister_tittel.slice(1)) : "Spørsmål",
        quote: q.tittel,
        contextNo: `Skriftlig spørsmål til ${q.sporsmal_til_minister_tittel || "ministeren"}`,
        contextEn: `Written question to the ${q.sporsmal_til_minister_tittel || "minister"}`,
        date: dateStr,
        id: String(q.id)
      });
    }
  });

  // Sort questions by date descending
  for (const repId in AGDER_REPS) {
    questionsByRep[repId].sort((a, b) => {
      const parse = str => {
        const parts = str.split(".");
        return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
      };
      return parse(b.date) - parse(a.date);
    });
  }

  // 6. Gather voting stats and voted cases
  console.log("Gathering voting stats and voted cases...");
  const voteSourceCases = allCases.filter(c => (c.session === "2024-2025" || c.session === "2025-2026") && c.status === 1);
  console.log(`Treated cases in sessions: ${voteSourceCases.length}`);

  // Reverse so we check the newest cases first (which are also cached and relevant)
  const casesToCheck = [...voteSourceCases].reverse().slice(0, 150);
  console.log(`Scanning up to ${casesToCheck.length} cases for voting results...`);

  const repVotes = {};
  for (const repId in AGDER_REPS) {
    repVotes[repId] = {
      possibleVotes: 0,
      attendedVotes: 0,
      votedCases: []
    };
  }

  let casesChecked = 0;
  let votingsFound = 0;

  for (const c of casesToCheck) {
    casesChecked++;
    if (casesChecked % 10 === 0) {
      console.log(`  Checked ${casesChecked}/${casesToCheck.length} cases...`);
    }

    try {
      const votingsRes = await fetchCached(`https://data.stortinget.no/eksport/voteringer?sakid=${c.id}&format=json`);
      if (!votingsRes.ok) continue;
      const votingsData = await votingsRes.json();
      const votings = votingsData.sak_votering_liste || [];
      
      if (votings.length > 0) {
        const personalVotings = votings.filter(v => v.personlig_votering);
        if (personalVotings.length > 0) {
          votingsFound += personalVotings.length;
          
          const votingsToFetch = personalVotings.slice(0, 6);
          for (const v of votingsToFetch) {
            const resultsRes = await fetchCached(`https://data.stortinget.no/eksport/voteringsresultat?voteringid=${v.votering_id}&format=json`);
            if (!resultsRes.ok) continue;
            
            const resultsData = await resultsRes.json();
            const votes = resultsData.voteringsresultat_liste || [];
            
            if (votes.length > 0) {
              const caseTitle = c.korttittel || c.tittel;
              const outcomeNo = v.vedtatt ? "Vedtatt" : "Forkastet";
              const outcomeEn = v.vedtatt ? "Passed" : "Rejected";
              const outcomeType = v.vedtatt ? "success" : "danger";

              for (const repId in AGDER_REPS) {
                const repRecord = votes.find(vote => vote.representant.id === repId);
                const varaRecord = votes.find(vote => vote.vara_for && vote.vara_for.id === repId);
                
                if (repRecord || varaRecord) {
                  repVotes[repId].possibleVotes++;
                  
                  const activeRecord = repRecord || varaRecord;
                  const voteVal = activeRecord.votering; // 1 = ikke_tilstede, 2 = for, 3 = mot
                  
                  let voteTextNo = "";
                  let voteTextEn = "";
                  
                  if (voteVal === 2) {
                    repVotes[repId].attendedVotes++;
                    voteTextNo = "Stemt for";
                    voteTextEn = "Voted for";
                  } else if (voteVal === 3) {
                    repVotes[repId].attendedVotes++;
                    voteTextNo = "Stemt mot";
                    voteTextEn = "Voted against";
                  } else {
                    voteTextNo = "Ikke til stede";
                    voteTextEn = "Absent";
                  }
                  
                  if (!repVotes[repId].votedCases.some(vc => vc.title === caseTitle)) {
                    repVotes[repId].votedCases.push({
                      title: caseTitle,
                      voteNo: voteTextNo,
                      voteEn: voteTextEn,
                      outcomeNo,
                      outcomeEn,
                      outcomeType
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(`  Error processing case ${c.id}:`, e);
    }
  }

  console.log(`Done scanning votings. Found ${votingsFound} personal voting events.`);

  // 7. Compile stats for each representative
  const compiledData = {};

  for (const repId in AGDER_REPS) {
    const repInfo = AGDER_REPS[repId];
    const votesInfo = repVotes[repId];
    
    // Attendance rate
    let attendance = 0;
    if (votesInfo.possibleVotes > 0) {
      attendance = Math.round((votesInfo.attendedVotes / votesInfo.possibleVotes) * 1000) / 10;
    }
    
    // Proposals (limit to 3 for UI)
    const rawProps = proposalsByRep[repId] || [];
    let uiProposals = rawProps.slice(0, 3).map(p => ({
      id: p.id,
      title: p.title,
      status: p.statusNo,
      statusNo: p.statusNo,
      statusEn: p.statusEn,
      statusType: p.statusType
    }));

    // If zero proposals, fall back to written questions!
    if (uiProposals.length === 0 && questionsByRep[repId] && questionsByRep[repId].length > 0) {
      const rawQs = questionsByRep[repId].slice(0, 3);
      uiProposals = rawQs.map(q => ({
        id: `Spørsmål ${q.id}`,
        title: q.quote,
        status: "Besvart",
        statusNo: "Besvart",
        statusEn: "Answered",
        statusType: "success"
      }));
    }

    // Voted cases (all of them for UI)
    let uiVotes = votesInfo.votedCases.map(v => ({
      title: v.title,
      voteNo: v.voteNo,
      voteEn: v.voteEn,
      outcomeNo: v.outcomeNo,
      outcomeEn: v.outcomeEn,
      outcomeType: v.outcomeType
    }));

    // Submitted proposals (secondary list, f.eks. status on proposals they sponsored, or the rest of their proposals)
    let uiSubmitted = rawProps.slice(3, 6).map(p => ({
      id: p.id,
      title: p.title,
      status: p.statusNo,
      statusNo: p.statusNo,
      statusEn: p.statusEn,
      statusType: p.statusType
    }));

    if (uiSubmitted.length === 0 && rawProps.length > 0) {
      uiSubmitted = rawProps.slice(0, Math.min(3, rawProps.length)).map(p => ({
        id: p.id,
        title: p.title,
        status: p.statusNo,
        statusNo: p.statusNo,
        statusEn: p.statusEn,
        statusType: p.statusType
      }));
    }

    // If still empty, fall back to more written questions!
    if (uiSubmitted.length === 0 && questionsByRep[repId] && questionsByRep[repId].length > 3) {
      const rawQs = questionsByRep[repId].slice(3, 6);
      uiSubmitted = rawQs.map(q => ({
        id: `Spørsmål ${q.id}`,
        title: q.quote,
        status: "Besvart",
        statusNo: "Besvart",
        statusEn: "Answered",
        statusType: "success"
      }));
    }

    // Statements/Uttalelser (limit to 3 for UI)
    const uiStatements = (questionsByRep[repId] || []).slice(0, 3).map(q => ({
      topic: q.topic,
      quote: q.quote,
      contextNo: q.contextNo,
      contextEn: q.contextEn,
      date: q.date
    }));

    compiledData[repId] = {
      attendance,
      possibleVotes: votesInfo.possibleVotes,
      attendedVotes: votesInfo.attendedVotes,
      proposals: uiProposals,
      votes: uiVotes,
      submitted: uiSubmitted,
      statements: uiStatements
    };

    console.log(`Rep: ${repInfo.name} (${repId})`);
    console.log(`  Attendance: ${attendance}% (${compiledData[repId].attendedVotes}/${compiledData[repId].possibleVotes})`);
    console.log(`  Proposals: ${rawProps.length}`);
    console.log(`  Questions: ${(questionsByRep[repId] || []).length}`);
  }

  // 8. Write to JSON file
  const outPath = "/Users/clovisbonja/Documents/agderbenken/my-app/src/data/representative_stats.json";
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(
    outPath,
    JSON.stringify(compiledData, null, 2),
    "utf-8"
  );
  
  console.log("=== REAL DATA COMPILED SUCCESSFULY ===");
  console.log(`File saved to ${outPath}`);
}

run().catch(console.error);
