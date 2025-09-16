import { squareClient } from "./_squareClient.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await squareClient.teamApi.searchTeamMembers({});
    const members = response.result.teamMembers || [];
    res.json({ teamMembers: members });
  } catch (err) {
    console.error("team error:", err);
    res.json({ teamMembers: demoTeam() });
  }
}

function demoTeam() {
  return [
    { id: "james", given_name: "James", family_name: "Smith" },
    { id: "dave", given_name: "Dave", family_name: "Gray" },
    { id: "ray", given_name: "Ray", family_name: "Johnson" }
  ];
}
