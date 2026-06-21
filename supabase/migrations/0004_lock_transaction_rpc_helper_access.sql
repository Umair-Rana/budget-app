-- Lock down private transaction RPC helper functions.
--
-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. The helper
-- functions below are intended to be called only by the public transaction RPCs,
-- so direct access is revoked after the 0003 RPC migration.

revoke all on function public._assert_finance_transaction_write_access(uuid)
from public, anon, authenticated;

revoke all on function public._finance_transaction_has_linked_source(
  public.transactions
)
from public, anon, authenticated;

revoke all on function public._assert_active_finance_account(uuid, uuid, text)
from public, anon, authenticated;

revoke all on function public._assert_finance_category(uuid, uuid, text, text)
from public, anon, authenticated;

revoke all on function public._assert_finance_transaction_input(
  uuid,
  text,
  numeric,
  date,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text
)
from public, anon, authenticated;

revoke all on function public._apply_finance_account_delta(uuid, uuid, numeric)
from public, anon, authenticated;

revoke all on function public._apply_finance_transaction_balance_impact(
  public.transactions,
  boolean
)
from public, anon, authenticated;

revoke all on function public.create_finance_transaction(
  uuid,
  uuid,
  text,
  numeric,
  date,
  time,
  timestamptz,
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  timestamptz,
  timestamptz
)
from public, anon;

revoke all on function public.update_finance_transaction(
  uuid,
  uuid,
  text,
  numeric,
  date,
  time,
  timestamptz,
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  boolean,
  timestamptz
)
from public, anon;

revoke all on function public.archive_finance_transaction(
  uuid,
  uuid,
  boolean,
  timestamptz
)
from public, anon;

revoke all on function public.delete_finance_transaction_soft(
  uuid,
  uuid,
  boolean,
  timestamptz
)
from public, anon;

grant execute on function public.create_finance_transaction(
  uuid,
  uuid,
  text,
  numeric,
  date,
  time,
  timestamptz,
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  timestamptz,
  timestamptz
) to authenticated;

grant execute on function public.update_finance_transaction(
  uuid,
  uuid,
  text,
  numeric,
  date,
  time,
  timestamptz,
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  boolean,
  timestamptz
) to authenticated;

grant execute on function public.archive_finance_transaction(
  uuid,
  uuid,
  boolean,
  timestamptz
) to authenticated;

grant execute on function public.delete_finance_transaction_soft(
  uuid,
  uuid,
  boolean,
  timestamptz
) to authenticated;
