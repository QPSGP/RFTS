require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");

async function main() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  const email = `smoke-test-${Date.now()}@example.invalid`;
  try {
    const r = await pool.query(
      `INSERT INTO moderator_applications
        (name, email, focus_areas, experience, links, phone, website, social_links, photo_url, profile_slug, status)
       VALUES ($1, $2, $3, $4, '', '', '', '', '', $5, 'pending')
       RETURNING id, email`,
      ["Test Facilitator", email, "Sleep", "Long enough experience for test.", "test-slug"]
    );
    console.log("INSERT OK", r.rows[0]);
  } catch (e) {
    console.error("INSERT FAIL", e.message);
    console.error("detail", e.detail);
    console.error("code", e.code);
  }
  await pool.end();
}

main();
