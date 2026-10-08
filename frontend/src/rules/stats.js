// Completed turns are the source of truth. A running turn is not an award yet.
export function sessionStats(session) {
  const perTeam = Array.from(
    { length: session?.settings?.teams?.length ?? 0 },
    () => ({ correct: 0, taboo: 0, skip: 0, points: 0 }),
  );
  const completed = [];
  let totalCards = 0;
  for (const turn of Array.isArray(session?.turns) ? session.turns : []) {
    if (!turn || !Number.isInteger(turn.team) || !perTeam[turn.team]) continue;
    const team = perTeam[turn.team];
    const log = Array.isArray(turn.log) ? turn.log : [];
    for (const entry of log) {
      if (!["correct", "taboo", "skip"].includes(entry?.result)) continue;
      team[entry.result]++;
      totalCards++;
    }
    const points = Number.isFinite(turn.points) ? turn.points : 0;
    team.points += points;
    completed.push({ team: turn.team, cycle: turn.cycle, points });
  }
  const best = completed.length
    ? Math.max(...completed.map((turn) => turn.points))
    : null;
  const bestTurns = completed.filter((turn) => turn.points === best);
  const mostTaboos = perTeam.length
    ? Math.max(...perTeam.map((team) => team.taboo))
    : 0;
  const tabooTeams = perTeam
    .map((team, index) => ({ ...team, index }))
    .filter((team) => mostTaboos > 0 && team.taboo === mostTaboos);
  return {
    perTeam,
    bestTurn: bestTurns.length === 1 ? bestTurns[0] : null,
    tabooKing: tabooTeams.length === 1 ? tabooTeams[0].index : null,
    totalCards,
  };
}
