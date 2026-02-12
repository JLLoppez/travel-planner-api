# Development Notes

## Build Log

Started: 2026-02-11 14:30
Completed: 2026-02-11 17:15
Total time: ~2h 45min

## Approach

1. Started with schema design - spent 20 mins sketching on paper first
2. Built services layer before GraphQL (easier to test in isolation)
3. Activity scoring took longest - had to tweak thresholds 3-4 times
4. Tests written alongside code (not after)

## Challenges

- **Skiing score was too harsh initially** - kept scoring 20-30 even in good conditions
  - Fixed by adjusting temperature range and giving more weight to snow depth
  
- **Indoor sightseeing baseline was wrong** - started at 0, should start at 50
  - Indoor activities are *always* viable, weather just makes them more/less appealing
  
- **Wind thresholds needed research** - wasn't sure what "dangerous" wind speed meant
  - Found that ski resorts close lifts above 60km/h, used that as cutoff

## Decisions

**Why not use a weather API with more features?**
- Open-Meteo has everything needed (temp, wind, precip, snow)
- No API key = evaluator can run immediately
- Free tier limits are generous

**Why score on next 24h instead of full 7 days?**
- More actionable - "should I go today" vs "maybe next week"
- Avoids averaging out good/bad days
- Users can always query tomorrow if needed

**Why no caching?**
- Weather changes hourly
- Open-Meteo is fast (~200ms)
- Caching would make results stale without clear benefit

## Testing Strategy

Focused on ActivityService because:
- Pure function = easy to test
- Core business logic = high value
- No mocking needed = fast, reliable tests

Didn't write integration tests because:
- Time constraint
- Would mostly test Apollo/axios (already tested libraries)
- Easy to add later if needed

## What I'd Change With More Time

1. Add more edge case tests (negative coords, invalid timezones)
2. Proper structured logging (Winston)
3. GraphQL query complexity analysis
4. Rate limiting per IP
5. Health check that actually pings Open-Meteo

## Open Questions for Product Team

- Should indoor sightseeing include shopping malls? Currently focused on museums/galleries
- Is "suitable" threshold (60) the right cutoff? Could make it configurable per activity
- Should we factor in time of day? (e.g. surfing at dawn vs noon)
- Do we need to handle southern hemisphere seasons differently?

---

Notes to self:
- Remember to update README if adding new activities
- ActivityService.rankActivities() always returns 4 items - don't change this without updating schema
- Open-Meteo uses ISO 8601 for timezones - validate input format
