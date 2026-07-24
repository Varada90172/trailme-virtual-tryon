from utils.db import create_user_databricks

print(
    create_user_databricks(
        "test@example.com",
        "hashed_password",
        "Test User"
    )
)