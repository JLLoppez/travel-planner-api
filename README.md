# Travel Planner API

A GraphQL API that recommends travel activities based on real-time weather forecasts.

## Overview

This API helps users make informed travel decisions by:
1. **Suggesting cities** based on partial search input
2. **Fetching 7-day weather forecasts** for any location  
3. **Ranking activities** (skiing, surfing, indoor/outdoor sightseeing) based on weather

Uses [Open-Meteo](https://open-meteo.com/) (free, no API key needed) for all weather data.

---

## Quick Start

```bash
npm install
npm run dev     # http://localhost:5000/graphql
npm test

---


## Architecture

### Design Principles
- **Clean separation:** Datasources handle HTTP, services have business logic, resolvers orchestrate
- **Dependency injection:** Services get their dependencies via constructor (makes testing way easier)
- **Pure functions where possible:** ActivityService has no external deps - just input → output
- **TypeScript everywhere:** Strict mode enabled, catches bugs at compile time
- **Tests are a first-class citizen:** Wrote tests alongside code, not as an afterthought

### Project Structure
```
src/
├── datasources/    # HTTP clients (Open-Meteo)
├── services/       # Business logic (pure)
├── graphql/        # Schema + thin resolvers
├── types/          # Shared interfaces
└── server.ts       # Composition root

tests/
├── unit/           # Pure logic tests
└── integration/    # Resolver tests
```

---

## GraphQL API

### Core Query
```graphql
query {
  activityRanking(
    latitude: -33.9249
    longitude: 18.4241
    timezone: "Africa/Johannesburg"
  ) {
    activities {
      type
      score       # 0-100
      suitable    # score >= 60
      reason      # Plain English
    }
  }
}
```

See `/graphql` for full schema (introspection enabled).

---

## Activity Scoring

Each activity scored **0–100** using **next 24 hours** of weather:

**⛷️ Skiing:** −15°C to −2°C, 30+ cm snow, calm winds  
**🏄 Surfing:** 18–32°C, 10–30 km/h winds, dry  
**🏛️ Indoor:** Boosted by bad outdoor weather  
**🌅 Outdoor:** 15–28°C, clear skies, no rain

Score ≥60 = suitable. Always returns ranked list + reasons.

---

## Testing

```bash
npm test              # Run all tests
npm test -- --coverage   # With coverage report
```

**Coverage targets:** 80% lines, 70% branches, 80% functions

---

## What's Included

✅ Complete working implementation  
✅ Full TypeScript (strict mode)  
✅ Comprehensive test suite  
✅ Clean architecture (extensible, testable)  
✅ Production-ready error handling  
✅ Non-technical documentation (see `.docx`)

---

## Omissions & Trade-offs

Given the **2-3 hour time constraint**, I deliberately left out:

❌ **Auth:** Not in the spec. Would add JWT middleware if needed.  
❌ **Rate limiting:** Open-Meteo's free tier is generous enough for this.  
❌ **Caching:** Weather changes frequently. Redis could help but adds complexity.  
❌ **Database:** API is stateless by design. Would need Postgres for user accounts.  
❌ **Deployment config:** Focused on code quality. Dockerfile is straightforward to add.  
❌ **Structured logging:** Using console.log for now. Winston/Pino for production.

---

## Future Enhancements

With more time:
1. More activities (cycling, hiking, whale watching)
2. Historical weather patterns
3. User personalization
4. Hotel/flight price integration
5. Multi-day trip optimization

---

## AI Tool Usage

I used **Claude/ChatGPT** for:
- Generating TypeScript interfaces from API docs (saved typing)
- Scaffolding test file structure
- Quick API documentation lookups
- Sanity checking my scoring logic

**What I didn't use AI for:**
- Activity scoring algorithm (designed this myself based on research)
- Architecture decisions (these came from experience)
- Test cases (wrote these based on what I thought could break)
- Comments and documentation (in my own words)

The scoring thresholds (e.g., "60 km/h wind is dangerous") came from actually researching ski resort policies and surfing guides, not from AI suggestions.

---

## Running Tests

The test suite demonstrates:
- **Unit tests:** Pure business logic (ActivityService)
- **Service tests:** GeocodingService, WeatherService
- **Integration tests:** Full GraphQL resolver flow
- **Edge cases:** Empty data, missing fields, extreme values

All tests run in < 2 seconds with no external dependencies.

---

## Contact

**Jose Lopes**  
📧 abiliolopes300@gmail.com  


---

**License:** MIT
