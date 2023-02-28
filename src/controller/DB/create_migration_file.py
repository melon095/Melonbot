import datetime
import sys
import os

FILE_OUTPUT = """import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {}

export async function down(db: Kysely<any>): Promise<void> {}"""

def curr_iso8601_date() -> str:
    return datetime.datetime.now().strftime("%Y_%m_%d_%H_%M_%S")

def arg() -> str:
    if len(sys.argv) > 1:
        return sys.argv[1]
    
    raise Exception(f"No argument was passed -> {sys.argv[0]} <migration_name>")

def file_name() -> str:
    return f"{curr_iso8601_date()}_{arg()}.ts"

curr_dir = os.path.dirname(os.path.abspath(__file__))

file_name = f"{curr_dir}/Migrations/{file_name()}"

with open(file_name, "w+") as file:
    try:
        file.write(FILE_OUTPUT)
        print(f"Created file: {file_name}")
    except Exception as e:
        print(f"Error writing to file: {file_name} -> {e}")
    finally:
        file.close()
    
