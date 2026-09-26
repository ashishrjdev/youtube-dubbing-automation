from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.models import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

if not settings.database_url:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy .env.example to .env and set the Supabase Postgres URI."
    )

database_url = settings.database_url.strip()
if database_url.startswith(("http://", "https://")):
    raise RuntimeError(
        "DATABASE_URL looks like an HTTP(S) API URL. Use the Postgres connection string from "
        "Supabase → Project Settings → Database → Connection string → URI "
        "(must start with postgresql://)."
    )
if not database_url.startswith(("postgresql://", "postgres://")):
    raise RuntimeError(
        "DATABASE_URL must be a Postgres URI starting with postgresql:// "
        "(Supabase → Project Settings → Database → Connection string → URI)."
    )
# SQLAlchemy / psycopg2 expect postgresql://
if database_url.startswith("postgres://"):
    database_url = "postgresql://" + database_url.removeprefix("postgres://")

# Always take the URL from app settings (Supabase via .env), never a hardcoded string.
config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = database_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
