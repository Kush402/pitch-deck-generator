# Pitch Kit

A powerful AI-driven platform for generating marketing scripts, media prompts, and assets for brand presentations.

## Features

- 🤖 **AI-Powered Script Generation**: Create compelling marketing scripts using advanced AI models
- 🎨 **Media Generation**: Generate high-quality images and animations based on script content
- 📁 **Smart Storage**: Automatically organize and store assets in Google Drive
- 🎯 **Brand Alignment**: Ensure all content aligns with brand voice and guidelines
- 🔄 **Workflow Automation**: Streamlined process from script to final assets

## Tech Stack

- **Backend**: Node.js with Express
- **AI/ML**: 
  - Gemini 2.0 Flash for script generation
  - Fal.ai for media generation
- **Storage**: Google Drive API
- **Additional Services**: Slack integration

## Prerequisites

- Node.js (v16 or higher)
- Google Cloud Platform account with Drive API enabled
- Fal.ai API key
- Gemini API key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# API Keys
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
FAL_AI_KEY=your_fal_ai_key

# Google Drive
GOOGLE_DRIVE_CLIENT_ID=your_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret
GOOGLE_DRIVE_REDIRECT_URI=your_redirect_uri
GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token

# Server
PORT=3000
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pitch-kit.git
cd pitch-kit
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Start the server:
```bash
npm start
```

## API Endpoints

### Script Generation
```http
POST /generate/script
Content-Type: application/json

{
  "brandInfo": {
    "name": "Brand Name",
    "description": "Brand Description",
    "targetAudience": "Target Audience",
    "values": ["Value1", "Value2"],
    "visualIdentity": "Visual Identity Description"
  },
  "campaignGoals": "Campaign Goals",
  "targetAudience": "Target Audience",
  "model": "gemini-2.0-flash"
}
```

### Media Prompts
```http
GET /generate/media-prompts?brand=BrandName
```

### Media Generation
```http
POST /generate/media
Content-Type: application/json

{
  "type": "image|video",
  "params": {
    "prompts": [
      {
        "prompt": "Image description",
        "style": "modern",
        "mood": "professional"
      }
    ]
  }
}
```

## Project Structure

```
src/
├── index.js              # Main application entry point
├── routes/               # API route handlers
│   ├── mediaGeneration.js
│   ├── media.js
│   ├── mediaPrompts.js
│   └── script.js
├── services/            # Core business logic
│   ├── ai/             # AI/ML services
│   ├── media/          # Media generation services
│   ├── storage/        # Storage services (Google Drive)
│   └── slack/          # Slack integration
├── config/             # Configuration files
└── utils/              # Utility functions
```

## Key Features

### Script Generation
- Structured script with sections
- Narrative content and key messages
- Visual elements and transitions
- Brand-aligned content

### Media Generation
- High-quality image generation
- Animation creation
- Style and mood customization
- Technical specifications

### Storage Management
- Organized folder structure
- Session-based organization
- Public access management
- Efficient file handling

## Development

### Running Tests
```bash
npm test
```

### Code Style
```bash
npm run lint
```

### Building
```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Gemini AI for script generation
- Fal.ai for media generation
- Google Drive API for storage
- All contributors and supporters

## Support

For support, email support@pitchkit.com or join our Slack channel.

## Roadmap

- [ ] Enhanced AI models integration
- [ ] Additional media generation options
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features
- [ ] Custom template support 