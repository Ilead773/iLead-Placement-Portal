import boto3

AWS_ACCESS_KEY_ID = "a90d0f2aa32c6cd80cb190dd7ea989b4"
AWS_SECRET_ACCESS_KEY = "f089021b643dc75cc51a580f9ae624fc51f8c9fb2e36ee924eebdea7b297dec3"
AWS_S3_ENDPOINT_URL = "https://ab9b5823c0dc84b7a80379d26b932ace.r2.cloudflarestorage.com"
AWS_STORAGE_BUCKET_NAME = "ilead-portal-media"

print("Listing all files in R2 credentials folder...")
s3 = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    endpoint_url=AWS_S3_ENDPOINT_URL
)

try:
    response = s3.list_objects_v2(Bucket=AWS_STORAGE_BUCKET_NAME, Prefix="private_credentials/")
    contents = response.get('Contents', [])
    print(f"Total objects found: {len(contents)}")
    for item in contents:
        print(f"  Key: {item['Key']} | Size: {item['Size']} bytes | Modified: {item['LastModified']}")
except Exception as e:
    print(f"Error: {e}")
