# Product Brief: Vocal Visualizer

## Vision

Vocal Visualizer is a tool to help data-driven beginner vocalists track and visualize metrics around their vocal progress. Characteristics like pitch, onset, sustain, tone, etc. have visualizations (e.g., pitch contours) that users can graph with their recordings to learn more about their progress and track their progression over time.

## Target Users

### Primary Persona: Beginner Vocalist

A beginner vocalist looking to use data and visualizations to measure their progress over time across key vocal characteristics. They are data-driven and want objective feedback on their singing, not just subjective listening.

**For the first iteration:** The product owner (human-in-the-loop) is the primary user as we build the prototype. As the application is built out and hardened, it may be released as a product in the market.

**Scale:** Early prototype will have <10 users total.

## MVP Scope (v1)

The MVP is a single, focused capability:

**Upload and visualize a pitch contour from a vocal recording.**

Specifically:
1. User uploads a single-session vocal recording
2. The system analyzes the recording and extracts pitch data
3. The system renders a visually pleasing pitch contour map:
   - Y-axis: Musical notes (pitch)
   - X-axis: Time
   - Shows how close the vocalist was to the intended pitch at any given moment
4. The user can view and interact with the visualization

### Explicitly Out of Scope for MVP
- Saved recordings / recording history
- Additional visualizations beyond pitch contour (onset, sustain, tone, etc.)
- Comparison with intended soundtrack/reference track
- User accounts / authentication
- Mobile-specific design
- Multi-user features

### Future Iterations (Roadmap Direction)
- Saved recordings and session history
- More visualization types (onset, sustain, tone, vibrato, etc.)
- Comparison with intended soundtrack overlay
- Progress tracking over time (trends, improvements)
- Additional vocal characteristics and metrics

## Platform

- **Web application** — responsive and tablet-friendly
- Mobile is out-of-scope but design should not preclude future mobile support

## Infrastructure Constraints

- **Cloud provider:** AWS
- **Cost ceiling:** $100/month in production, near $0 when idle
- **Scale:** <10 users for prototype phase
