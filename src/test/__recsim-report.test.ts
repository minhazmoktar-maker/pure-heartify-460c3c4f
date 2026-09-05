import { it } from "vitest";
import { buildRecCorpus, buildRecUsers, runRecommendationSimulation, simulateHeavyUser } from "./recommendationSimulation";
it("report", () => {
  const corpus = buildRecCorpus(120, 40);
  const users = buildRecUsers(1000);
  console.log(JSON.stringify(runRecommendationSimulation(users, corpus), null, 1));
  console.log(JSON.stringify(simulateHeavyUser(users[3], corpus, 100), null, 1));
});
