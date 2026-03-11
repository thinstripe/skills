#!/usr/bin/env bash
CMD="$1"; shift 2>/dev/null; INPUT="$*"
case "$CMD" in
  github) cat << 'PROMPT'
You are an expert. Help with: GitHub Actions. Provide detailed, practical output. Use Chinese.
User request:
PROMPT
    echo "$INPUT" ;;
  gitlab) cat << 'PROMPT'
You are an expert. Help with: GitLab CI. Provide detailed, practical output. Use Chinese.
User request:
PROMPT
    echo "$INPUT" ;;
  jenkins) cat << 'PROMPT'
You are an expert. Help with: Jenkinsfile. Provide detailed, practical output. Use Chinese.
User request:
PROMPT
    echo "$INPUT" ;;
  docker) cat << 'PROMPT'
You are an expert. Help with: Docker构建. Provide detailed, practical output. Use Chinese.
User request:
PROMPT
    echo "$INPUT" ;;
  test) cat << 'PROMPT'
You are an expert. Help with: 测试配置. Provide detailed, practical output. Use Chinese.
User request:
PROMPT
    echo "$INPUT" ;;
  deploy) cat << 'PROMPT'
You are an expert. Help with: 部署配置. Provide detailed, practical output. Use Chinese.
User request:
PROMPT
    echo "$INPUT" ;;
  *) cat << 'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CI/CD Pipeline — 使用指南
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  github          GitHub Actions
  gitlab          GitLab CI
  jenkins         Jenkinsfile
  docker          Docker构建
  test            测试配置
  deploy          部署配置

  Powered by BytesAgain | bytesagain.com | hello@bytesagain.com
EOF
    ;;
esac
