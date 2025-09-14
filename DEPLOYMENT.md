# Render.com Deployment Guide

This guide will help you deploy your application on Render.com.

## Prerequisites

1. **Render.com Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Mailgun Account**: For email functionality
4. **Environment Variables**: All required environment variables

## Environment Variables

Set these environment variables in your Render.com dashboard:

### Required Variables
- `MAILGUN_API_KEY`: Your Mailgun API key
- `MAILGUN_EMAIL_DOMAIN`: Your Mailgun domain (e.g., akunlama.com)
- `ADMIN_ACCESS_KEY`: Admin access key
- `WEBSITE_DOMAIN`: Your Render.com app URL (e.g., akunlama.onrender.com)
- `BANNED_USERNAMES`: Comma-separated list of banned usernames

### Optional Variables
- `BANNED_IPS`: Comma-separated list of banned IPs
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)
- `MAILGUN_EMAIL_DOMAIN`: Frontend Mailgun domain (for Vite build)
- `WEBSITE_DOMAIN`: Frontend website domain (for Vite build)

## Deployment Methods

### Method 1: Using Dockerfile (Recommended)

1. **Create a new Web Service on Render.com**
   - Go to Render Dashboard → Create New → Web Service
   - Connect your GitHub repository
   - Select your repository

2. **Configure the service**
   - **Name**: `akunlama` (or your preferred name)
   - **Environment**: Docker
   - **Build Command**: Leave empty (will use Dockerfile)
   - **Start Command**: Leave empty (will use CMD from Dockerfile)
   - **Instance Type**: Free or Starter

3. **Add Environment Variables**
   - In the "Environment" tab, add all required variables
   - Example:
     ```
     MAILGUN_API_KEY=your_actual_api_key
     MAILGUN_EMAIL_DOMAIN=your_domain.com
     ADMIN_ACCESS_KEY=your_admin_key
     WEBSITE_DOMAIN=akunlama.onrender.com
     BANNED_USERNAMES=faturrasyidmuhammad07,diani38071,pazaleegre,cemiloktay2,theboybil,diandikaara,hawkman7609,autenticview,yogiceper25,green14fly,najman8522,faradina6986,wyizrjo2g86kclm,research-population-76,endangpurwanti0511,melanyp_andini,obeidblicke,aspakpahtan21,ardiclops,sevvalkapci
     ```

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application

### Method 2: Using Render.yaml (Advanced)

Create a `render.yaml` file in your repository root:

```yaml
services:
  - type: web
    name: akunlama
    env: docker
    repo: https://github.com/your-username/akunlama
    dockerfilePath: ./Dockerfile.prod
    envVars:
      - key: MAILGUN_API_KEY
        value: your_mailgun_api_key
      - key: MAILGUN_EMAIL_DOMAIN
        value: your_domain.com
      - key: ADMIN_ACCESS_KEY
        value: your_admin_key
      - key: WEBSITE_DOMAIN
        value: akunlama.onrender.com
      - key: BANNED_USERNAMES
        value: faturrasyidmuhammad07,diani38071,pazaleegre,cemiloktay2,theboybil,diandikaara,hawkman7609,autenticview,yogiceper25,green14fly,najman8522,faradina6986,wyizrjo2g86kclm,research-population-76,endangpurwanti0511,melanyp_andini,obeidblicke,aspakpahtan21,ardiclops,sevvalkapci
      - key: MAILGUN_EMAIL_DOMAIN
        value: your_domain.com
      - key: WEBSITE_DOMAIN
        value: akunlama.onrender.com
      - key: NODE_ENV
        value: production
```

## Local Development with Docker

### Development Mode
```bash
# Development with hot reload
docker-compose --profile dev up app-dev

# Access at:
# API: http://localhost:8001
# UI: http://localhost:5174
```

### Production Mode (Local)
```bash
# Production build locally
docker-compose --profile prod up app-prod

# Access at:
# API: http://localhost:8000
```

### Standard Mode
```bash
# Standard development mode
docker-compose up app

# Access at:
# API: http://localhost:8000
# UI: http://localhost:5173
```

## Testing Locally Before Deployment

1. **Build and test the production image**
```bash
docker build -f Dockerfile.prod -t akunlama-prod .
docker run -p 8000:8000 --env-file .env akunlama-prod
```

2. **Test with production environment variables**
```bash
# Create a test .env file
cp .env .env.test
# Edit .env.test with production-like values
docker-compose --profile prod up app-prod
```

## Troubleshooting

### Common Issues

1. **Application crashes on startup**
   - Check environment variables in Render dashboard
   - View logs in Render dashboard
   - Ensure all required variables are set

2. **Build fails**
   - Check Dockerfile syntax
   - Ensure all dependencies are properly installed
   - View build logs in Render dashboard

3. **Email not working**
   - Verify Mailgun API key and domain
   - Check Mailgun account status
   - Review email sending logs

4. **Frontend not loading**
   - Check MAILGUN_EMAIL_DOMAIN and WEBSITE_DOMAIN environment variables
   - Ensure CORS is properly configured
   - Check browser console for errors

### Log Viewing

- **Render Dashboard**: View logs in your service dashboard
- **Local Docker**: `docker logs <container-name>`
- **Docker Compose**: `docker-compose logs app-prod`

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **HTTPS**: Render automatically provides SSL certificates
3. **Rate Limiting**: Consider implementing rate limiting for email endpoints
4. **Input Validation**: Ensure all user inputs are properly validated
5. **Authentication**: Protect admin endpoints with proper authentication

## Monitoring

- **Render Dashboard**: Monitor service health and performance
- **Logs**: View application logs in real-time
- **Metrics**: Track CPU, memory, and network usage
- **Health Checks**: Implement health check endpoints for better monitoring

## Support

- **Render Documentation**: [https://render.com/docs](https://render.com/docs)
- **Mailgun Documentation**: [https://documentation.mailgun.com](https://documentation.mailgun.com)
- **GitHub Issues**: Report bugs or request features

## Post-Deployment Checklist

- [ ] Application loads correctly at the Render URL
- [ ] Email functionality works properly
- [ ] All environment variables are correctly set
- [ ] Admin endpoints are accessible with correct key
- [ ] Banned users/IPs are properly enforced
- [ ] Frontend builds and loads correctly
- [ ] Error logs are monitored
- [ ] SSL certificate is active (automatic on Render)
- [ ] Database connections (if any) are working