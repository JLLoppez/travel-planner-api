# Implementation Notes

Quick brain dump of how I built this and what I learned.

## Time Breakdown

- **30 mins:** Schema design on paper, researching Open-Meteo API
- **45 mins:** Building service layer (GeocodingService, WeatherService)
- **60 mins:** Activity scoring logic (lots of trial and error here)
- **30 mins:** GraphQL wiring and manual testing
- **30 mins:** Tests and polish

Total: ~2h 45min

## What Took Longer Than Expected

### Activity Scoring
Spent way too long getting the thresholds right. Initial version had skiing scoring 15-25 even in perfect conditions at Innsbruck. Had to:

1. Research what "good skiing weather" actually means
2. Test with real coordinates (Innsbruck, Banff, Aspen)
3. Adjust weight of each factor multiple times

The breakthrough was realizing I need to give more points for snow depth (40 pts) and less for perfect temperature (35 pts down from 50).

### Indoor Sightseeing Logic
First version started score at 0. Tested with Cape Town summer data and indoor was scoring 15 while outdoor was at 85. That's technically correct but felt wrong - museums are ALWAYS a viable option, weather just makes them more/less appealing.

Changed baseline to 50 and inverted the logic. Now bad weather boosts the score rather than good weather penalizing it. Much better.

### Surfing Wind Logic
Turns out I don't know anything about surfing conditions! Had to:
- Research offshore vs onshore winds
- Find out what wind speed actually creates good waves
- Learn that calm water (< 10 km/h) is actually BAD for surfing

Initial version gave max score to 5 km/h winds. Wrong! Changed to reward 10-30 km/h range.

## Bugs I Fixed

### Snow Depth Optional Field
Open-Meteo doesn't always return snow_depth. Had a crash when testing with coastal cities. Fixed with `?? 0` operator but missed it in one place initially. TypeScript caught it during compilation.

### Timezone Format Issues
Open-Meteo is picky about timezone format. Has to be IANA format like "Africa/Johannesburg" not "GMT+2" or "SAST". Added a TODO to validate this input.

### Clear Hours Calculation
Had a division by zero bug when hours array was empty (would never happen in practice but tests caught it). Fixed by using `Math.max(hours.length, 1)`.

## Design Decisions

### Why 24 Hours Not 7 Days?
User is asking "what should I do?" not "what should I do next week?". Scoring on next 24 hours gives actionable advice. If they want to plan ahead they can query for tomorrow's date.

### Why No Caching?
Open-Meteo is fast (~150-250ms) and weather changes hourly. Caching would need:
- Redis dependency
- Cache invalidation logic (how long is forecast valid?)
- More complexity for minimal gain

Decision: Skip it. Can add later if Open-Meteo becomes a bottleneck.

### Why Services Are Pure Functions?
Makes testing WAY easier. ActivityService doesn't know about HTTP, databases, config, environment - just takes data in, returns scores out. Can test exhaustively without mocking anything.

GeocodingService and WeatherService get the HTTP client injected, so in tests I can pass a mock client. Never hits real API during test runs.

## Things I Would Change

### Better Error Messages
Right now errors just say "Geocoding search failed" or "Weather forecast fetch failed". Should include:
- What city/coordinates were requested
- Whether it's a network issue vs invalid input
- Retry-able vs permanent error

### Query Validation
GraphQL validates types but not semantics. Can request:
- Latitude 9999 (invalid)
- Timezone "WHATEVER" (Open-Meteo will error)
- Count -5 cities (makes no sense)

Should add validation middleware before calling services.

### Separate Test Fixtures
Tests have inline fixture functions (`makeHour()`, `makeForecast()`). Should move these to separate file and reuse across test files. Current approach works but doesn't scale.

### Logging
Using `console.log` which is fine for local dev but production needs structured logs with request IDs. Would add Winston or Pino if deploying for real.

## Interesting Edge Cases Found

### Cape Town Test Case
Testing with Cape Town coords returned great surfing scores (85+) in December but skiing was literally 0. Makes sense geographically but was fun to see the algorithm work correctly.

### Innsbruck in Summer
Tested with Innsbruck in August - skiing still scored 45 because snow depth on peaks. Algorithm doesn't know about seasonal closures. Could add date-based adjustments (skiing penalty from June-September in northern hemisphere).

### Death Valley Coordinates
Tested with extreme heat location - indoor sightseeing scored 72 because outdoor was penalized so heavily. Reasonable!

## Code Patterns I Like

### Error Handling in HTTP Client
```typescript
catch (error) {
  throw this.normaliseError('Context message', error);
}
```

Wraps Axios errors into clean Error objects with context. Resolvers don't see raw Axios internals.

### Service Composition in Resolvers
```typescript
const city = buildCity(coords);
const forecast = await weatherService.getForecast(city);
const activities = activityService.rankActivities(forecast);
```

Clean pipeline. Each service does one thing. Easy to follow.

### Fixture Builders in Tests
```typescript
const makeHour = (overrides = {}) => ({ ...defaults, ...overrides });
```

Can create test data easily: `makeHour({ temperature2m: -5 })`. Less boilerplate, tests are readable.

## AI Usage Notes

Used Claude to:
- Generate initial TypeScript interfaces from Open-Meteo docs (saved 20 mins of typing)
- Scaffold test file structure
- Quick lookups on WMO weather codes

Did NOT use AI for:
- Scoring algorithm design (this came from research + trial/error)
- Architecture decisions (based on experience with similar APIs)
- Actual test cases (wrote these based on what I thought would break)

The scoring thresholds are all from actual research:
- Ski resort closure policies (60 km/h wind limit)
- Surfing guides (10-30 km/h offshore winds)
- Personal experience (Cape Town surfing in winter is cold!)

## Final Thoughts

Really enjoyed this. Building the scoring logic was the fun part - had to actually think about what makes weather "good" for each activity.

If I were building this for real, I'd:
1. Add way more activities (there's an endless list)
2. Let users customize thresholds (some people love cold weather skiing)
3. Pull in real venue data (which ski resorts are actually open?)
4. Historical weather patterns for better recommendations

The architecture makes all of these doable without major refactoring.

Time well spent: ~3 hours with breaks. Clean code, well tested, production-ready structure.
