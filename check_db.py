import psycopg2

conn = psycopg2.connect(
    'postgresql://neondb_owner:npg_rsA75eOJIouY@ep-square-tree-a4jyw7js-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
)
cur = conn.cursor()

# 查看所有表
cur.execute("""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
""")
tables = cur.fetchall()
print('=== Tables ===')
for t in tables:
    print(f'  - {t[0]}')

# 查看每个表的结构
for (table_name,) in tables:
    print(f'\n=== {table_name} ===')
    cur.execute(f"""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = '{table_name}'
        ORDER BY ordinal_position;
    """)
    for col in cur.fetchall():
        null = 'NULL' if col[2] == 'YES' else 'NOT NULL'
        print(f'  {col[0]}: {col[1]} ({null})')

    # 查看记录数
    cur.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cur.fetchone()[0]
    print(f'  -> {count} rows')

conn.close()
