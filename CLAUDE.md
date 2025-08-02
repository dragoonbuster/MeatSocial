# Claude Development Context

## Project Role

Claude serves as the principal developer and technical architect for MeatSocial, working alongside Chris Jones to build a human-verified social platform that evolves into internet-layer infrastructure.

## Development Guidelines

### Code Style
- TypeScript for all new code
- Clean, readable code with meaningful variable names
- Comprehensive error handling and logging
- Security-first approach to all implementations
- No comments unless absolutely necessary for complex logic

### Architecture Principles
- Microservices architecture for scalability
- Zero-trust security model
- Privacy by design
- Graceful degradation
- Database-agnostic where possible

### Technology Stack
- Frontend: React 18+ with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL with Redis for caching
- Authentication: Custom cryptographic proof system
- Deployment: Docker containers on AWS/Cloudflare

### Testing Standards
- Unit tests for all business logic
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Security testing for verification systems
- Performance testing for scale requirements

### Git Workflow
- Commit after every meaningful change
- Clear, descriptive commit messages
- Never include Claude as co-author
- No emojis or symbols in commits
- Push to remote after every commit

### Security Requirements
- All user input validated and sanitized
- End-to-end encryption for sensitive data
- Regular dependency updates and security scans
- Minimal data collection and storage
- Immediate deletion of biometric data after processing

### Performance Targets
- Page load times under 2 seconds
- API response times under 100ms
- Support for 10M+ concurrent users at scale
- 99.9% uptime requirement

## Project Structure

```
/
├── frontend/          # React TypeScript application
├── backend/           # Node.js API server
├── verification/      # Physical node verification system
├── protocol/          # Custom protocol implementation (Phase 3)
├── extension/         # Browser extension (Phase 2)
├── docs/             # Technical documentation
├── scripts/          # Build and deployment scripts
└── tests/            # Test suites
```

## Development Commands

### Preferred Tools
- Use TypeScript for type safety
- Use ESLint and Prettier for code formatting
- Use Jest for testing
- Use Docker for containerization

### Testing Commands
```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:e2e      # End-to-end tests
npm run test:security # Security tests
```

### Build Commands
```bash
npm run build         # Production build
npm run dev           # Development server
npm run lint          # Code linting
npm run typecheck     # TypeScript validation
```

## Critical Considerations

### Verification System
- Physical presence is non-negotiable for initial verification
- Cryptographic proofs must be tamper-evident
- Zero-knowledge approach to protect user privacy
- Regular re-verification to maintain trust

### Scalability Planning
- Design for Facebook-scale traffic from day one
- Implement horizontal scaling patterns
- Use CDN for global content delivery
- Plan for mesh networking integration

### User Experience
- Anti-addictive design principles
- Accessibility compliance (WCAG 2.1 AA)
- Mobile-first responsive design
- Time-locking features for thoughtful posting

## Security Checklist

- [ ] Input validation on all user data
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens for state-changing operations
- [ ] Rate limiting on all endpoints
- [ ] Secure session management
- [ ] Encrypted data transmission
- [ ] Regular security audits

## Deployment Strategy

### MVP (Phase 1)
- Single AWS region deployment
- PostgreSQL RDS with Redis ElastiCache
- CloudFront CDN for static assets
- ECS for container orchestration

### Scale (Phase 2+)
- Multi-region deployment
- Database sharding by user ID
- Microservices architecture
- Kubernetes for orchestration

## Monitoring and Observability

- Application performance monitoring (APM)
- Real-time error tracking
- User behavior analytics (privacy-compliant)
- Infrastructure monitoring
- Security event logging

## Communication Guidelines

- Focus on implementation over explanation
- Provide clear, actionable feedback
- Question architectural decisions when necessary
- Prioritize security and user privacy
- Think long-term for scalability decisions