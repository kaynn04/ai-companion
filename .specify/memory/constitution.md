# AI Companion Constitution

## Core Principles

### I. Pipeline Architecture (NON-NEGOTIABLE)
Every fan message flows through a sequential pipeline: AI text → voice synthesis → video generation. This ensures modularity, scalability, and clear responsibility at each stage.

### II. Real-Time Responsiveness
The system prioritizes real-time responsiveness. Text is delivered first, with media upgrades (audio, video) processed asynchronously to maintain user engagement.

### III. Minimalist Frontend Design
The frontend is designed to be immersive and distraction-free. It features a single-screen interface with no complex navigation, ensuring simplicity and focus.

### IV. Graceful Degradation
Error handling follows a graceful degradation pattern: if video generation fails, the system falls back to audio; if audio fails, it falls back to text. This ensures uninterrupted user experience.

### V. Server-Side Media Generation
All media (text, audio, video) is generated server-side using Azure OpenAI for LLM, ElevenLabs for voice synthesis, and D-ID for video. Media is served via Express static routes for efficiency and reliability.

## Additional Constraints

### Technology Stack
- Azure OpenAI for language model processing.
- ElevenLabs for voice synthesis.
- D-ID for video generation.
- Express.js for server-side routing and static file serving.

### Performance Standards
- Text responses must be delivered within 500ms.
- Audio and video upgrades must not exceed 2 seconds for processing.

## Development Workflow

### Testing and Quality Gates
- Unit tests for each pipeline stage.
- Integration tests for end-to-end pipeline validation.
- Load testing to ensure real-time performance under peak conditions.

### Code Review Process
- All pull requests must include test results.
- Code must adhere to the principles outlined in this constitution.

## Governance

This constitution supersedes all other practices. Amendments require:
- Documentation of proposed changes.
- Approval from the project lead.
- A migration plan to ensure compliance with updated principles.

**Version**: 1.0.0 | **Ratified**: 2026-04-01 | **Last Amended**: 2026-04-01
