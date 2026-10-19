# MediCloud documentation

- [Project README](../README.md)
- [Architecture and application flows](ARCHITECTURE.md)
- [AWS setup and deployment guide](DEPLOYMENT.md)
- [EC2 host and network settings](aws/EC2.md)
- [HTTPS and reverse proxy verification](HTTPS.md)
- [Vercel frontend settings](VERCEL.md)
- [Security and privacy checklist](SECURITY.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- AWS service references:
  - [IAM](aws/IAM.md)
  - [Amazon Cognito](aws/COGNITO.md)
  - [Amazon S3](aws/S3.md)
  - [Amazon DynamoDB](aws/DYNAMODB.md)
- [Systems Manager Parameter Store](aws/SSM-PARAMETER-STORE.md)
- [Consolidated infrastructure configuration reference](aws/CONFIGURATION-REFERENCE.md)
- [EC2 instance and network](aws/EC2.md)
- [Systems Manager Parameter Store](aws/SSM-PARAMETER-STORE.md)
- [Consolidated AWS configuration reference](aws/CONFIGURATION-REFERENCE.md)
- [HTTPS and reverse proxy operations](HTTPS.md)
- [Vercel frontend configuration](VERCEL.md)
- [Existing manual AWS and EC2 runbook](manual-aws-and-ec2.md)

## Verification boundary

These documents describe checked-in source and the existing runbook. No AWS account inspection or live deployment verification was performed. Deployment identifiers supplied outside the repository are treated as unverified until an operator confirms them in AWS. The repository's environment examples use `ap-south-1`, mock providers, and no SSM loader is present in source.
