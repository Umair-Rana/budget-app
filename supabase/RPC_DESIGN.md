# Household Finance Supabase RPC Design

Milestone 4M is planning-only. This document designs cloud RPCs for Bills,
Goals, and Loans so future implementation can avoid client-side balance
mutation and preserve the current IndexedDB behavior.

No runtime code, migrations, repositories, or UI are implemented by this
document.

## 1. Architecture

The cloud data-source should follow the same pattern established for
Transactions:

1. Normal read methods use scoped `select` queries.
2. Mutating methods call Postgres RPC functions.
3. RPC functions validate household write access, input state, ownership, and
   linked-record rules.
4. RPC functions update module records, linked transaction records, and account
   balances inside one database transaction.
5. Repositories map returned rows through existing Supabase mappers.
6. `activeFinanceDataSource` remains IndexedDB until an explicit future switch.

### Text Flow

```text
UI or service
  -> repository contract
    -> Supabase repository factory with { client, householdId, userId }
      -> normal SELECT for reads
      -> RPC for mutations
        -> write access check
        -> row/account/category validation
        -> linked transaction lifecycle
        -> account balance impact
        -> module row update
        -> return row or JSON payload
```

### Existing Transaction RPC Dependency

`create_finance_transaction`, `update_finance_transaction`,
`archive_finance_transaction`, and `delete_finance_transaction_soft` already
perform balance-safe transaction mutations. Future Bills, Goals, and Loans RPCs
can either call shared private helper functions from the transaction migration
or duplicate only the minimal impact logic they need.

Recommendation: introduce shared private helper functions in each future
migration only when needed, then consolidate later if duplication grows. Avoid
calling public transaction RPCs from source-managed module RPCs if their
standalone linked-record guardrails would fight source-managed behavior.

## 2. Current Local Logic Summary

### Bills

Reads:
- `getAll` and `getById` exclude deleted and archived records by default.
- Unpaid bill status is computed from due date: overdue if before today,
  pending if due within two days, otherwise upcoming.

Create:
- Requires name, positive amount, due date, expense category, and frequency.
- Expense category must be active and not deleted.
- Creates a bill with unpaid status derived from due date.
- No account balance changes.
- No linked transaction is created.

Update:
- Archived or deleted bills cannot be edited.
- If the bill is paid, payment-sensitive fields cannot change until unmarked:
  amount, category, and due date.
- Revalidates amount, due date, frequency, and active expense category.
- Keeps paid status if already paid, otherwise recomputes unpaid status.

Mark paid:
- Requires payment date and payment account.
- Bill must not be archived, deleted, or already paid.
- Category must still be active expense.
- Payment account must be active.
- Creates linked expense transaction:
  - `type = expense`
  - `amount = bill.amount`
  - `category_id = bill.category_id`
  - `from_account_id = payment_account_id`
  - `date = payment_date`
  - `linked_bill_id = bill.id`
- Decreases payment account balance.
- Sets bill status to paid, stores payment account and linked transaction ID.

Mark unpaid:
- If bill is not paid, returns current unpaid status.
- If paid, loads the linked transaction.
- If linked transaction exists and is not deleted:
  - reverses its account impact if not archived
  - soft deletes linked transaction
- Clears bill payment account and linked transaction ID.
- Recomputes unpaid status from due date.

Archive/delete:
- If paid, reverse linked payment as in mark unpaid.
- Clear payment account and linked transaction ID.
- Set archived or deleted timestamp.
- Paid status becomes current unpaid status.

### Goals

Reads:
- `getAll` and `getById` exclude deleted and archived records by default.
- Status is derived: completed when current amount is at least target, otherwise
  active. Archived goals report archived.

Create:
- Requires name, positive target amount, non-negative current amount,
  current amount not greater than target, valid optional target date, and
  priority.
- Creates the goal only.
- No account balance changes and no linked transaction.

Update:
- Archived, deleted, or archived-status goals cannot change.
- If current amount is being changed and active linked goal movements exist,
  reject because linked movements own the amount.
- Revalidates full merged goal input.
- Recomputes status from amount unless archived.

Contribution:
- Requires positive amount, date, and source account.
- Goal must be changeable.
- Contribution cannot exceed target amount.
- Source account must be active.
- Creates linked transfer transaction:
  - `type = transfer`
  - `from_account_id = source_account_id`
  - no `to_account_id`
  - `linked_goal_id = goal.id`
- Decreases the source account balance.
- Increases goal current amount.
- Returns `{ goal, transaction }`.

Withdrawal:
- Requires positive amount, date, and destination account.
- Goal must be changeable.
- Withdrawal cannot exceed saved goal amount.
- Destination account must be active.
- Creates linked transfer transaction:
  - `type = transfer`
  - no `from_account_id`
  - `to_account_id = destination_account_id`
  - `linked_goal_id = goal.id`
- Increases destination account balance.
- Decreases goal current amount.
- Returns `{ goal, transaction }`.

Archive/delete:
- Finds all linked goal transactions.
- For each linked transaction that is not deleted:
  - reverses account balance impact if not archived
  - soft deletes the linked transaction
  - calculates goal current amount reversal
- Updates goal current amount by subtracting reversed contribution delta, clamped
  between zero and target.
- Sets status archived plus archived or deleted timestamp.

### Loans

Reads:
- `getAll` and `getById` exclude deleted and archived records by default.
- Status is derived: archived, completed when outstanding is zero, overdue when
  due date is past, partially paid when outstanding is below principal,
  otherwise active.

Create:
- Requires name, type, positive principal, non-negative optional interest rate,
  valid optional due date.
- Given loans require source account.
- Taken loans require receiving account.
- Creates opening linked transfer:
  - given: `from_account_id = source_account_id`, decreases account balance
  - taken: `to_account_id = receiving_account_id`, increases account balance
  - `linked_loan_id = loan.id`
- Creates loan with outstanding equal to principal and stores opening linked
  transaction ID.

Update:
- Archived or deleted loans cannot change.
- If financial details change and active linked loan movements exist, reject.
  Financial details are type, principal, source account, receiving account.
- Revalidates merged input and active account.
- If principal changes while allowed, outstanding resets to new principal.
- Recomputes derived status.

Record payment:
- Requires positive amount, date, and account.
- Loan must be changeable and outstanding must be greater than zero.
- Payment cannot exceed outstanding.
- Account must be active.
- Creates linked transfer:
  - given loan repayment received:
    - `to_account_id = account_id`
    - increases receiving account balance
  - taken loan repayment made:
    - `from_account_id = account_id`
    - decreases payment account balance
  - `linked_loan_id = loan.id`
- Decreases outstanding amount.
- Returns `{ loan, transaction }`.

Archive/delete:
- Finds all linked loan transactions, including opening and repayments.
- For each linked transaction that is not deleted:
  - reverses account balance impact if not archived
  - soft deletes the linked transaction
  - calculates outstanding amount reversal
- Updates outstanding amount by subtracting reversed outstanding delta, clamped
  between zero and principal.
- Sets status archived plus archived or deleted timestamp.

## 3. Shared RPC Conventions

### Function Naming

Use `finance` in public function names to match existing transaction RPCs and
avoid generic names:

```text
create_finance_bill
update_finance_bill
archive_finance_bill
delete_finance_bill_soft
mark_finance_bill_paid
mark_finance_bill_unpaid

create_finance_goal
update_finance_goal
archive_finance_goal
delete_finance_goal_soft
contribute_to_finance_goal
withdraw_from_finance_goal

create_finance_loan
update_finance_loan
archive_finance_loan
delete_finance_loan_soft
record_finance_loan_payment
```

Private helpers should begin with `_`.

### Security

Recommended SQL function settings:

```sql
language plpgsql
volatile
security definer
set search_path = public
```

Every public mutation RPC must:
- require `auth.uid()` to exist
- call `public.can_write_household(p_household_id)`
- validate that mutated records belong to `p_household_id`
- validate account/category rows belong to `p_household_id`
- avoid dynamic SQL
- grant execute only to `authenticated`
- revoke execute on private helpers from `public`, `anon`, and `authenticated`

### Ownership Checks

Shared helper candidates:

```text
_assert_finance_write_access(household_id)
_assert_active_account(household_id, account_id, label)
_assert_active_expense_category(household_id, category_id)
_assert_bill_mutable(bill)
_assert_goal_mutable(goal)
_assert_loan_mutable(loan)
_apply_account_delta(household_id, account_id, amount_delta)
_soft_delete_linked_transaction(transaction_id, updated_at)
```

### Linked Transaction Protection

Normal Transactions UI flows must not update linked transactions directly.
Bills, Goals, and Loans are source-managed modules and may create or soft-delete
their own linked transactions inside their own RPCs.

Rules:
- Linked transaction fields must be set only by module RPCs.
- Linked transaction deletion should be soft delete.
- When reversing linked movement, reverse account balance only if linked
  transaction is not archived and not deleted.
- If linked transaction is missing, fail for source-critical operations unless
  current local behavior tolerates absence. Bills currently tolerate missing
  linked payment when reversing; future cloud design should prefer a clear
  warning/error unless backward compatibility needs tolerance.

### Timestamp Handling

Public RPCs should accept optional timestamp parameters only when preserving
client-created IDs/timestamps is necessary:

```text
p_created_at timestamptz default now()
p_updated_at timestamptz default now()
```

Otherwise use `now()` inside SQL. For linked transactions and source rows
created in the same RPC, use one `v_now := now()` value.

### Return Format

Use row returns when the repository contract returns one module record:

```sql
returns public.bills
returns public.goals
returns public.loans
```

Use `jsonb` for movement methods that must return both module row and linked
transaction row:

```json
{
  "goal": { "...": "goal row" },
  "transaction": { "...": "transaction row" }
}
```

```json
{
  "loan": { "...": "loan row" },
  "transaction": { "...": "transaction row" }
}
```

Repositories should map nested rows through existing mappers.

### Error Style

Use direct, user-facing messages aligned with local repository messages where
possible. Prefer failing before mutation. For concurrency conflicts, raise a
clear error and rely on the database transaction to rollback all changes.

### Audit Hooks

Future audit logging should be inserted inside the same RPC transaction after
the primary mutation succeeds. Suggested event names:

```text
bill.created, bill.updated, bill.paid, bill.unpaid, bill.archived, bill.deleted
goal.created, goal.updated, goal.contributed, goal.withdrawn, goal.archived, goal.deleted
loan.created, loan.updated, loan.payment_recorded, loan.archived, loan.deleted
```

## 4. Bills RPC Design

### RPC List

| RPC | Contract Method | Return |
| --- | --- | --- |
| `create_finance_bill` | `create` | `public.bills` |
| `update_finance_bill` | `update` | `public.bills` |
| `archive_finance_bill` | `archive` | `public.bills` |
| `delete_finance_bill_soft` | `deleteSoft` | `public.bills` |
| `mark_finance_bill_paid` | `markPaid` | `public.bills` |
| `mark_finance_bill_unpaid` | `markUnpaid` | `public.bills` |

### `create_finance_bill`

Parameters:

| Parameter | Type | Notes |
| --- | --- | --- |
| `p_household_id` | `uuid` | Required scope |
| `p_bill_id` | `uuid` | Client-generated or defaulted |
| `p_name` | `text` | Trimmed, required |
| `p_amount` | `numeric` | Must be greater than zero |
| `p_category_id` | `uuid` | Active expense category in household |
| `p_due_date` | `date` | Required |
| `p_frequency` | `text` | `none`, `weekly`, `monthly`, `quarterly`, `yearly` |
| `p_notes` | `text` | Optional |
| `p_created_at` | `timestamptz` | Optional default `now()` |
| `p_updated_at` | `timestamptz` | Optional default `now()` |

Atomic operations:
1. Check write access.
2. Validate input.
3. Validate category belongs to household and is active expense.
4. Insert bill with derived unpaid status.
5. Return bill row.

No balance mutation and no linked transaction.

### `update_finance_bill`

Parameters: same editable fields as create plus `p_bill_id`.

Validation:
- Bill exists in household.
- Bill is not archived or deleted.
- If paid, block payment-sensitive changes: amount, category, due date.
- Category remains active expense.

Atomic operations:
1. Lock bill row with `for update`.
2. Validate current and merged state.
3. Update bill fields.
4. Preserve paid status when paid; otherwise recompute unpaid status.
5. Return bill row.

### `mark_finance_bill_paid`

Parameters:

| Parameter | Type | Notes |
| --- | --- | --- |
| `p_household_id` | `uuid` | Required scope |
| `p_bill_id` | `uuid` | Bill to pay |
| `p_transaction_id` | `uuid` | Linked transaction ID |
| `p_payment_account_id` | `uuid` | Active account in household |
| `p_payment_date` | `date` | Required |
| `p_notes` | `text` | Optional payment notes |
| `p_updated_at` | `timestamptz` | Optional default `now()` |

Validation:
- Bill exists, not archived/deleted, not already paid.
- Bill category is still active expense.
- Payment account is active and belongs to household.

Atomic operations:
1. Lock bill.
2. Insert linked expense transaction with `linked_bill_id`.
3. Decrease payment account balance by bill amount.
4. Set bill status paid, payment account ID, linked transaction ID.
5. Return bill row.

Failure behavior: any failed insert, account update, or bill update rolls back.

### `mark_finance_bill_unpaid`

Parameters:
- `p_household_id`
- `p_bill_id`
- `p_updated_at`

Atomic operations:
1. Lock bill.
2. If not paid, return bill with current unpaid status.
3. Load linked transaction if present.
4. If linked transaction exists and is not deleted:
   - reverse balance impact if not archived
   - soft delete linked transaction
5. Clear bill payment fields.
6. Set status to current unpaid status.
7. Return bill row.

### Archive and Soft Delete

`archive_finance_bill` and `delete_finance_bill_soft` should share the same
linked payment reversal behavior as `mark_finance_bill_unpaid`, then set
`archived_at` or `deleted_at`.

## 5. Goals RPC Design

### RPC List

| RPC | Contract Method | Return |
| --- | --- | --- |
| `create_finance_goal` | `create` | `public.goals` |
| `update_finance_goal` | `update` | `public.goals` |
| `archive_finance_goal` | `archive` | `public.goals` |
| `delete_finance_goal_soft` | `deleteSoft` | `public.goals` |
| `contribute_to_finance_goal` | `addContribution` | `jsonb` |
| `withdraw_from_finance_goal` | `withdraw` | `jsonb` |

### `create_finance_goal`

Parameters:

| Parameter | Type | Notes |
| --- | --- | --- |
| `p_household_id` | `uuid` | Required scope |
| `p_goal_id` | `uuid` | Client-generated or defaulted |
| `p_name` | `text` | Trimmed, required |
| `p_target_amount` | `numeric` | Greater than zero |
| `p_current_amount` | `numeric` | Non-negative, not above target |
| `p_target_date` | `date` | Optional |
| `p_priority` | `text` | `low`, `medium`, `high` |
| `p_icon` | `text` | Optional |
| `p_color` | `text` | Optional |
| `p_notes` | `text` | Optional |

No account balance mutation. No linked transaction.

### `update_finance_goal`

Validation:
- Goal exists in household.
- Goal is not archived/deleted.
- If current amount changes, reject when active linked goal transactions exist.
- Merged amount values remain valid.

Atomic operations:
1. Lock goal row.
2. Check active linked movements if current amount changes.
3. Update fields.
4. Recompute status from current amount and target.
5. Return goal row.

### `contribute_to_finance_goal`

Parameters:

| Parameter | Type | Notes |
| --- | --- | --- |
| `p_household_id` | `uuid` | Required scope |
| `p_goal_id` | `uuid` | Target goal |
| `p_transaction_id` | `uuid` | Linked transaction ID |
| `p_amount` | `numeric` | Greater than zero |
| `p_source_account_id` | `uuid` | Active account |
| `p_date` | `date` | Required |
| `p_notes` | `text` | Optional |

Atomic operations:
1. Lock goal.
2. Validate goal can change.
3. Validate contribution does not exceed target.
4. Validate source account.
5. Insert linked transfer transaction with only `from_account_id`.
6. Decrease source account balance.
7. Increase goal current amount.
8. Recompute goal status.
9. Return `{ goal, transaction }`.

### `withdraw_from_finance_goal`

Same as contribution except:
- Requires destination account.
- Amount cannot exceed current saved amount.
- Insert linked transfer transaction with only `to_account_id`.
- Increase destination account balance.
- Decrease goal current amount.
- Return `{ goal, transaction }`.

### Archive and Soft Delete

`archive_finance_goal` and `delete_finance_goal_soft` must:
1. Lock goal.
2. Load all non-deleted linked goal transactions.
3. For each non-archived linked transaction, reverse account balance impact.
4. Soft delete each linked transaction.
5. Adjust current amount by reversing linked movement deltas and clamp.
6. Set status archived plus archived/deleted timestamp.
7. Return goal row.

## 6. Loans RPC Design

### RPC List

| RPC | Contract Method | Return |
| --- | --- | --- |
| `create_finance_loan` | `create` | `public.loans` |
| `update_finance_loan` | `update` | `public.loans` |
| `archive_finance_loan` | `archive` | `public.loans` |
| `delete_finance_loan_soft` | `deleteSoft` | `public.loans` |
| `record_finance_loan_payment` | `recordPayment` | `jsonb` |

### `create_finance_loan`

Parameters:

| Parameter | Type | Notes |
| --- | --- | --- |
| `p_household_id` | `uuid` | Required scope |
| `p_loan_id` | `uuid` | Client-generated or defaulted |
| `p_transaction_id` | `uuid` | Opening linked transaction |
| `p_name` | `text` | Required |
| `p_type` | `text` | `given` or `taken` |
| `p_counterparty` | `text` | Optional |
| `p_principal_amount` | `numeric` | Greater than zero |
| `p_interest_rate` | `numeric` | Optional, non-negative |
| `p_due_date` | `date` | Optional |
| `p_source_account_id` | `uuid` | Required for given |
| `p_receiving_account_id` | `uuid` | Required for taken |
| `p_notes` | `text` | Optional |

Atomic operations:
1. Check write access.
2. Validate loan input and account ownership.
3. Insert opening linked transfer:
   - given: source account only, decreases account
   - taken: receiving account only, increases account
4. Apply account balance impact.
5. Insert loan with outstanding equal to principal and linked transaction ID.
6. Return loan row.

### `update_finance_loan`

Validation:
- Loan exists, not archived/deleted.
- If financial details change, reject when active linked loan movements exist.
- Financial details: type, principal, source account, receiving account.
- Validate merged input and active required account.

Atomic operations:
1. Lock loan.
2. Check active linked movement count when financial details change.
3. Update fields.
4. If principal changes and allowed, reset outstanding to principal.
5. Recompute status.
6. Return loan row.

### `record_finance_loan_payment`

Parameters:

| Parameter | Type | Notes |
| --- | --- | --- |
| `p_household_id` | `uuid` | Required scope |
| `p_loan_id` | `uuid` | Loan |
| `p_transaction_id` | `uuid` | Linked payment transaction |
| `p_amount` | `numeric` | Greater than zero |
| `p_account_id` | `uuid` | Payment/receiving account |
| `p_date` | `date` | Required |
| `p_notes` | `text` | Optional |

Atomic operations:
1. Lock loan.
2. Validate loan can change.
3. Reject when outstanding is zero or payment exceeds outstanding.
4. Validate account.
5. Insert linked transfer:
   - loan given: repayment received uses only `to_account_id`
   - loan taken: repayment made uses only `from_account_id`
6. Apply account balance impact.
7. Reduce outstanding amount.
8. Recompute status.
9. Return `{ loan, transaction }`.

### Archive and Soft Delete

`archive_finance_loan` and `delete_finance_loan_soft` must:
1. Lock loan.
2. Load all non-deleted linked loan transactions, including opening movement.
3. Reverse balance impact for each non-archived linked transaction.
4. Soft delete each linked transaction.
5. Adjust outstanding amount by reversing linked movement deltas and clamp.
6. Set status archived plus archived/deleted timestamp.
7. Return loan row.

## 7. Repository Planning

### Bills Repository

RPC-backed methods:
- `create`
- `update`
- `archive`
- `deleteSoft`
- `markPaid`
- `markUnpaid`

Normal SELECT methods:
- `getAll`
- `getById`

Mapper usage:
- `fromSupabaseBillRow` for all RPC row returns.
- `toSupabaseBillUpdate` may remain useful for payload conventions, but RPC
  parameter construction will likely be explicit.

### Goals Repository

RPC-backed methods:
- `create`
- `update`
- `archive`
- `deleteSoft`
- `addContribution`
- `withdraw`

Normal SELECT methods:
- `getAll`
- `getById`

Mapper usage:
- `fromSupabaseGoalRow` for goal row.
- `fromSupabaseTransactionRow` for movement JSON transaction row.

### Loans Repository

RPC-backed methods:
- `create`
- `update`
- `archive`
- `deleteSoft`
- `recordPayment`

Normal SELECT methods:
- `getAll`
- `getById`

Mapper usage:
- `fromSupabaseLoanRow` for loan row.
- `fromSupabaseTransactionRow` for payment JSON transaction row.

## 8. Future SQL Migration Sequence

Do not create these migrations during Milestone 4M.

### `0005_bill_rpc.sql`

Status: implemented in Milestone 4N.

Purpose:
- Add bill RPC functions and private helpers for due status and linked payment
  reversal.

Objects:
- `create_finance_bill`
- `update_finance_bill`
- `archive_finance_bill`
- `delete_finance_bill_soft`
- `mark_finance_bill_paid`
- `mark_finance_bill_unpaid`
- private bill helper functions
- execute grants/revokes

Dependencies:
- Base tables
- RLS helper `can_write_household`
- Transaction impact helper conventions from 0003

### `0006_goal_rpc.sql`

Status: implemented in Milestone 4O.

Purpose:
- Add goal RPC functions and movement JSON returns.

Objects:
- `create_finance_goal`
- `update_finance_goal`
- `archive_finance_goal`
- `delete_finance_goal_soft`
- `contribute_to_finance_goal`
- `withdraw_from_finance_goal`
- private goal helper functions
- execute grants/revokes

Dependencies:
- Base tables
- Transaction impact helper conventions
- JSON return mapping plan

### `0007_loan_rpc.sql`

Status: implemented in Milestone 4P.

Purpose:
- Add loan RPC functions and linked loan movement handling.

Objects:
- `create_finance_loan`
- `update_finance_loan`
- `archive_finance_loan`
- `delete_finance_loan_soft`
- `record_finance_loan_payment`
- private loan helper functions
- execute grants/revokes

Dependencies:
- Base tables
- Transaction impact helper conventions
- Goal movement JSON return pattern

## 9. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Double balance updates | Keep all module mutation methods RPC-only in Supabase repositories; do not call transaction repository plus module repository separately. |
| Duplicate linked transactions | Lock source row with `for update`; reject paid bill or completed loan states before insert; store linked transaction ID when applicable. |
| Concurrent edits | Use row locks on source rows and linked rows; perform validation after locks. |
| Partial failures | Keep module row, linked transaction, and account balance changes inside one RPC transaction. |
| Missing linked records | Prefer fail-fast for unexpected missing linked transactions; document any compatibility exceptions. |
| Archived linked transactions | Reverse balance only for active linked transactions; still soft delete linked rows for source cleanup. |
| Household permission mistakes | Every public RPC takes `p_household_id` and validates source/account/category/transaction rows against it. |
| Incorrect goal/loan reversal math | Implement SQL tests or seed QA data before activation; mirror `getGoalMovementDelta` and `getLoanMovementOutstandingDelta`. |
| Status drift | Use SQL helper functions for current bill, goal, and loan status derivation. |
| Future sync conflicts | Treat cloud RPCs as authoritative mutation path; local-to-cloud migration must not replay already-linked movements twice. |

## 10. Recommended Implementation Order

1. Implement and apply `0005_bill_rpc.sql`.
2. Add Supabase Bills repository behind explicit factory.
3. Add mocked repository tests for bill RPC calls and linked payment behavior.
4. Implement and apply `0006_goal_rpc.sql`.
5. Add Supabase Goals repository behind explicit factory.
6. Add mocked repository tests for contribution/withdraw JSON returns.
7. Implement and apply `0007_loan_rpc.sql`.
8. Add Supabase Loans repository behind explicit factory.
9. Run manual cloud QA in a non-production household.
10. Only after all module RPCs are stable, design data-source switching and
    local-to-cloud migration.
