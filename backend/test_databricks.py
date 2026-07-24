from utils.databricks_connection import connection

try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT CURRENT_USER()")
        result = cursor.fetchone()
        print("✅ Connected successfully!")
        print("Current User:", result)

except Exception as e:
    print("❌ Connection Failed")
    print(e)

finally:
    connection.close()