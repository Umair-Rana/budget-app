export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          created_by: string | null
          currency: string
          current_balance: number
          deleted_at: string | null
          household_id: string
          icon: string | null
          id: string
          institution: string | null
          name: string
          notes: string | null
          opening_balance: number
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_balance?: number
          deleted_at?: string | null
          household_id: string
          icon?: string | null
          id?: string
          institution?: string | null
          name: string
          notes?: string | null
          opening_balance?: number
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_balance?: number
          deleted_at?: string | null
          household_id?: string
          icon?: string | null
          id?: string
          institution?: string | null
          name?: string
          notes?: string | null
          opening_balance?: number
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_history: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          household_id: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          household_id: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          household_id?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_history_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount: number
          archived_at: string | null
          category_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string
          frequency: string
          household_id: string
          id: string
          last_generated_date: string | null
          linked_transaction_id: string | null
          name: string
          next_due_date: string | null
          notes: string | null
          paid_at: string | null
          payment_account_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          archived_at?: string | null
          category_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_date: string
          frequency: string
          household_id: string
          id?: string
          last_generated_date?: string | null
          linked_transaction_id?: string | null
          name: string
          next_due_date?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_account_id?: string | null
          status: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          archived_at?: string | null
          category_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_date?: string
          frequency?: string
          household_id?: string
          id?: string
          last_generated_date?: string | null
          linked_transaction_id?: string | null
          name?: string
          next_due_date?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_account_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          archived_at: string | null
          category_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          group_name: string | null
          household_id: string
          id: string
          month: string
          notes: string | null
          planned_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          category_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          group_name?: string | null
          household_id: string
          id?: string
          month: string
          notes?: string | null
          planned_amount: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          category_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          group_name?: string | null
          household_id?: string
          id?: string
          month?: string
          notes?: string | null
          planned_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          created_by: string | null
          default_key: string | null
          deleted_at: string | null
          household_id: string
          icon: string | null
          id: string
          is_default: boolean
          name: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          default_key?: string | null
          deleted_at?: string | null
          household_id: string
          icon?: string | null
          id?: string
          is_default?: boolean
          name: string
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          default_key?: string | null
          deleted_at?: string | null
          household_id?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          name?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          created_by: string | null
          current_amount: number
          deleted_at: string | null
          household_id: string
          icon: string | null
          id: string
          name: string
          notes: string | null
          priority: string
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          current_amount?: number
          deleted_at?: string | null
          household_id: string
          icon?: string | null
          id?: string
          name: string
          notes?: string | null
          priority: string
          status: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          current_amount?: number
          deleted_at?: string | null
          household_id?: string
          icon?: string | null
          id?: string
          name?: string
          notes?: string | null
          priority?: string
          status?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          deleted_at: string | null
          expires_at: string | null
          household_id: string
          id: string
          invited_by: string | null
          invited_email: string
          role: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          household_id: string
          id?: string
          invited_by?: string | null
          invited_email: string
          role?: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          household_id?: string
          id?: string
          invited_by?: string | null
          invited_email?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          id: string
          locale: string
          name: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          id?: string
          locale?: string
          name: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          id?: string
          locale?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          archived_at: string | null
          counterparty: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string | null
          household_id: string
          id: string
          interest_rate: number | null
          linked_transaction_id: string | null
          name: string
          notes: string | null
          outstanding_amount: number
          principal_amount: number
          receiving_account_id: string | null
          source_account_id: string | null
          status: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          counterparty?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_date?: string | null
          household_id: string
          id?: string
          interest_rate?: number | null
          linked_transaction_id?: string | null
          name: string
          notes?: string | null
          outstanding_amount: number
          principal_amount: number
          receiving_account_id?: string | null
          source_account_id?: string | null
          status: string
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          counterparty?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_date?: string | null
          household_id?: string
          id?: string
          interest_rate?: number | null
          linked_transaction_id?: string | null
          name?: string
          notes?: string | null
          outstanding_amount?: number
          principal_amount?: number
          receiving_account_id?: string | null
          source_account_id?: string | null
          status?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_receiving_account_id_fkey"
            columns: ["receiving_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          amount: number
          archived_at: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          end_date: string | null
          frequency: string
          from_account_id: string | null
          household_id: string
          id: string
          interval: number
          is_active: boolean
          last_generated_at: string | null
          last_generated_for_date: string | null
          name: string
          next_run_date: string
          notes: string | null
          start_date: string
          to_account_id: string | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_date?: string | null
          frequency: string
          from_account_id?: string | null
          household_id: string
          id?: string
          interval?: number
          is_active?: boolean
          last_generated_at?: string | null
          last_generated_for_date?: string | null
          name: string
          next_run_date: string
          notes?: string | null
          start_date: string
          to_account_id?: string | null
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_date?: string | null
          frequency?: string
          from_account_id?: string | null
          household_id?: string
          id?: string
          interval?: number
          is_active?: boolean
          last_generated_at?: string | null
          last_generated_for_date?: string | null
          name?: string
          next_run_date?: string
          notes?: string | null
          start_date?: string
          to_account_id?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          archived_at: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          from_account_id: string | null
          household_id: string
          id: string
          linked_bill_id: string | null
          linked_goal_id: string | null
          linked_loan_id: string | null
          linked_source_id: string | null
          linked_source_type: string | null
          notes: string | null
          payment_method: string | null
          receipt_name: string | null
          receipt_path: string | null
          receipt_thumbnail: string | null
          tags: string[]
          time: string | null
          to_account_id: string | null
          transaction_datetime: string | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          deleted_at?: string | null
          from_account_id?: string | null
          household_id: string
          id?: string
          linked_bill_id?: string | null
          linked_goal_id?: string | null
          linked_loan_id?: string | null
          linked_source_id?: string | null
          linked_source_type?: string | null
          notes?: string | null
          payment_method?: string | null
          receipt_name?: string | null
          receipt_path?: string | null
          receipt_thumbnail?: string | null
          tags?: string[]
          time?: string | null
          to_account_id?: string | null
          transaction_datetime?: string | null
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          from_account_id?: string | null
          household_id?: string
          id?: string
          linked_bill_id?: string | null
          linked_goal_id?: string | null
          linked_loan_id?: string | null
          linked_source_id?: string | null
          linked_source_type?: string | null
          notes?: string | null
          payment_method?: string | null
          receipt_name?: string | null
          receipt_path?: string | null
          receipt_thumbnail?: string | null
          tags?: string[]
          time?: string | null
          to_account_id?: string | null
          transaction_datetime?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_linked_bill_id_fkey"
            columns: ["linked_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_linked_goal_id_fkey"
            columns: ["linked_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_linked_loan_id_fkey"
            columns: ["linked_loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _apply_finance_account_delta: {
        Args: {
          balance_delta: number
          target_account_id: string
          target_household_id: string
        }
        Returns: undefined
      }
      _apply_finance_transaction_balance_impact: {
        Args: {
          reverse_impact?: boolean
          target_transaction: Database["public"]["Tables"]["transactions"]["Row"]
        }
        Returns: undefined
      }
      _assert_active_finance_account: {
        Args: {
          label: string
          target_account_id: string
          target_household_id: string
        }
        Returns: undefined
      }
      _assert_finance_bill_input: {
        Args: {
          bill_amount: number
          bill_category_id: string
          bill_due_date: string
          bill_frequency: string
          bill_name: string
          target_household_id: string
        }
        Returns: undefined
      }
      _assert_finance_category: {
        Args: {
          expected_type: string
          missing_message: string
          target_category_id: string
          target_household_id: string
        }
        Returns: undefined
      }
      _assert_finance_goal_can_change: {
        Args: { target_goal: Database["public"]["Tables"]["goals"]["Row"] }
        Returns: undefined
      }
      _assert_finance_goal_input: {
        Args: {
          current_amount: number
          goal_name: string
          goal_priority: string
          target_amount: number
          target_date: string
        }
        Returns: undefined
      }
      _assert_finance_loan_can_change: {
        Args: { target_loan: Database["public"]["Tables"]["loans"]["Row"] }
        Returns: undefined
      }
      _assert_finance_loan_input: {
        Args: {
          due_date: string
          interest_rate: number
          loan_name: string
          loan_type: string
          outstanding_amount: number
          principal_amount: number
          receiving_account_id: string
          source_account_id: string
        }
        Returns: undefined
      }
      _assert_finance_transaction_input: {
        Args: {
          destination_account_id: string
          source_account_id: string
          target_category_id: string
          target_household_id: string
          target_linked_goal_id: string
          target_linked_loan_id: string
          target_linked_source_type: string
          transaction_amount: number
          transaction_date: string
          transaction_type: string
        }
        Returns: undefined
      }
      _assert_finance_transaction_write_access: {
        Args: { target_household_id: string }
        Returns: undefined
      }
      _clamp_finance_amount: {
        Args: {
          maximum_amount: number
          minimum_amount: number
          target_amount: number
        }
        Returns: number
      }
      _clamp_finance_loan_outstanding: {
        Args: { principal_amount: number; target_amount: number }
        Returns: number
      }
      _finance_bill_status_for_due_date: {
        Args: { target_due_date: string }
        Returns: string
      }
      _finance_goal_has_active_movements: {
        Args: { target_goal_id: string; target_household_id: string }
        Returns: boolean
      }
      _finance_goal_movement_delta: {
        Args: {
          target_transaction: Database["public"]["Tables"]["transactions"]["Row"]
        }
        Returns: number
      }
      _finance_goal_status_for_amount: {
        Args: { current_amount: number; target_amount: number }
        Returns: string
      }
      _finance_loan_has_active_movements: {
        Args: { target_household_id: string; target_loan_id: string }
        Returns: boolean
      }
      _finance_loan_movement_outstanding_delta: {
        Args: {
          target_loan_type: string
          target_transaction: Database["public"]["Tables"]["transactions"]["Row"]
        }
        Returns: number
      }
      _finance_loan_status_for_amount: {
        Args: {
          due_date: string
          outstanding_amount: number
          principal_amount: number
        }
        Returns: string
      }
      _finance_transaction_has_linked_source: {
        Args: {
          target_transaction: Database["public"]["Tables"]["transactions"]["Row"]
        }
        Returns: boolean
      }
      _reverse_finance_bill_payment: {
        Args: {
          target_bill: Database["public"]["Tables"]["bills"]["Row"]
          target_updated_at: string
        }
        Returns: undefined
      }
      _reverse_finance_goal_movements: {
        Args: {
          target_goal: Database["public"]["Tables"]["goals"]["Row"]
          target_updated_at: string
        }
        Returns: number
      }
      _reverse_finance_loan_movements: {
        Args: {
          target_loan: Database["public"]["Tables"]["loans"]["Row"]
          target_updated_at: string
        }
        Returns: number
      }
      accept_household_invite: {
        Args: { p_invite_id: string }
        Returns: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          id: string
          locale: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "households"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_finance_bill: {
        Args: {
          p_bill_id: string
          p_household_id: string
          p_updated_at?: string
        }
        Returns: {
          amount: number
          archived_at: string | null
          category_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string
          frequency: string
          household_id: string
          id: string
          last_generated_date: string | null
          linked_transaction_id: string | null
          name: string
          next_due_date: string | null
          notes: string | null
          paid_at: string | null
          payment_account_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bills"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_finance_goal: {
        Args: {
          p_goal_id: string
          p_household_id: string
          p_updated_at?: string
        }
        Returns: {
          archived_at: string | null
          color: string | null
          created_at: string
          created_by: string | null
          current_amount: number
          deleted_at: string | null
          household_id: string
          icon: string | null
          id: string
          name: string
          notes: string | null
          priority: string
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "goals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_finance_loan: {
        Args: {
          p_household_id: string
          p_loan_id: string
          p_updated_at?: string
        }
        Returns: {
          archived_at: string | null
          counterparty: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string | null
          household_id: string
          id: string
          interest_rate: number | null
          linked_transaction_id: string | null
          name: string
          notes: string | null
          outstanding_amount: number
          principal_amount: number
          receiving_account_id: string | null
          source_account_id: string | null
          status: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "loans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_finance_transaction: {
        Args: {
          p_allow_linked?: boolean
          p_household_id: string
          p_transaction_id: string
          p_updated_at?: string
        }
        Returns: {
          amount: number
          archived_at: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          from_account_id: string | null
          household_id: string
          id: string
          linked_bill_id: string | null
          linked_goal_id: string | null
          linked_loan_id: string | null
          linked_source_id: string | null
          linked_source_type: string | null
          notes: string | null
          payment_method: string | null
          receipt_name: string | null
          receipt_path: string | null
          receipt_thumbnail: string | null
          tags: string[]
          time: string | null
          to_account_id: string | null
          transaction_datetime: string | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bootstrap_finance_household: {
        Args: { p_email?: string }
        Returns: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          id: string
          locale: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "households"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_write_household: {
        Args: { target_household_id: string }
        Returns: boolean
      }
      create_finance_bill: {
        Args: {
          p_amount: number
          p_bill_id: string
          p_category_id: string
          p_created_at?: string
          p_due_date: string
          p_frequency: string
          p_household_id: string
          p_name: string
          p_notes?: string
          p_updated_at?: string
        }
        Returns: {
          amount: number
          archived_at: string | null
          category_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string
          frequency: string
          household_id: string
          id: string
          last_generated_date: string | null
          linked_transaction_id: string | null
          name: string
          next_due_date: string | null
          notes: string | null
          paid_at: string | null
          payment_account_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bills"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_finance_goal: {
        Args: {
          p_color?: string
          p_created_at?: string
          p_current_amount: number
          p_goal_id: string
          p_household_id: string
          p_icon?: string
          p_name: string
          p_notes?: string
          p_priority?: string
          p_target_amount: number
          p_target_date?: string
          p_updated_at?: string
        }
        Returns: {
          archived_at: string | null
          color: string | null
          created_at: string
          created_by: string | null
          current_amount: number
          deleted_at: string | null
          household_id: string
          icon: string | null
          id: string
          name: string
          notes: string | null
          priority: string
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "goals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_finance_loan: {
        Args: {
          p_counterparty?: string
          p_created_at?: string
          p_due_date?: string
          p_household_id: string
          p_interest_rate?: number
          p_loan_id: string
          p_name: string
          p_notes?: string
          p_opened_date?: string
          p_principal_amount?: number
          p_receiving_account_id?: string
          p_source_account_id?: string
          p_transaction_id: string
          p_type: string
          p_updated_at?: string
        }
        Returns: {
          archived_at: string | null
          counterparty: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string | null
          household_id: string
          id: string
          interest_rate: number | null
          linked_transaction_id: string | null
          name: string
          notes: string | null
          outstanding_amount: number
          principal_amount: number
          receiving_account_id: string | null
          source_account_id: string | null
          status: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "loans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_finance_transaction: {
        Args: {
          p_amount: number
          p_category_id?: string
          p_created_at?: string
          p_date: string
          p_from_account_id?: string
          p_household_id: string
          p_linked_bill_id?: string
          p_linked_goal_id?: string
          p_linked_loan_id?: string
          p_linked_source_id?: string
          p_linked_source_type?: string
          p_notes?: string
          p_time?: string
          p_to_account_id?: string
          p_transaction_datetime?: string
          p_transaction_id: string
          p_type: string
          p_updated_at?: string
        }
        Returns: {
          amount: number
          archived_at: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          from_account_id: string | null
          household_id: string
          id: string
          linked_bill_id: string | null
          linked_goal_id: string | null
          linked_loan_id: string | null
          linked_source_id: string | null
          linked_source_type: string | null
          notes: string | null
          payment_method: string | null
          receipt_name: string | null
          receipt_path: string | null
          receipt_thumbnail: string | null
          tags: string[]
          time: string | null
          to_account_id: string | null
          transaction_datetime: string | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_household_invite: {
        Args: {
          p_household_id: string
          p_invited_email: string
          p_role?: string
        }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          deleted_at: string | null
          expires_at: string | null
          household_id: string
          id: string
          invited_by: string | null
          invited_email: string
          role: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "household_invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_finance_bill_soft: {
        Args: {
          p_bill_id: string
          p_household_id: string
          p_updated_at?: string
        }
        Returns: {
          amount: number
          archived_at: string | null
          category_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string
          frequency: string
          household_id: string
          id: string
          last_generated_date: string | null
          linked_transaction_id: string | null
          name: string
          next_due_date: string | null
          notes: string | null
          paid_at: string | null
          payment_account_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bills"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_finance_goal_soft: {
        Args: {
          p_goal_id: string
          p_household_id: string
          p_updated_at?: string
        }
        Returns: {
          archived_at: string | null
          color: string | null
          created_at: string
          created_by: string | null
          current_amount: number
          deleted_at: string | null
          household_id: string
          icon: string | null
          id: string
          name: string
          notes: string | null
          priority: string
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "goals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_finance_loan_soft: {
        Args: {
          p_household_id: string
          p_loan_id: string
          p_updated_at?: string
        }
        Returns: {
          archived_at: string | null
          counterparty: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string | null
          household_id: string
          id: string
          interest_rate: number | null
          linked_transaction_id: string | null
          name: string
          notes: string | null
          outstanding_amount: number
          principal_amount: number
          receiving_account_id: string | null
          source_account_id: string | null
          status: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "loans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_finance_transaction_soft: {
        Args: {
          p_allow_linked?: boolean
          p_household_id: string
          p_transaction_id: string
          p_updated_at?: string
        }
        Returns: {
          amount: number
          archived_at: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          from_account_id: string | null
          household_id: string
          id: string
          linked_bill_id: string | null
          linked_goal_id: string | null
          linked_loan_id: string | null
          linked_source_id: string | null
          linked_source_type: string | null
          notes: string | null
          payment_method: string | null
          receipt_name: string | null
          receipt_path: string | null
          receipt_thumbnail: string | null
          tags: string[]
          time: string | null
          to_account_id: string | null
          transaction_datetime: string | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_household_members: {
        Args: { p_household_id: string }
        Returns: {
          created_at: string
          email: string
          household_id: string
          id: string
          role: string
          user_id: string
        }[]
      }
      get_household_pending_invites: {
        Args: { p_household_id: string }
        Returns: {
          created_at: string
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          invited_email: string
          role: string
          status: string
        }[]
      }
      get_my_household_invites: {
        Args: never
        Returns: {
          created_at: string
          expires_at: string
          household_id: string
          household_name: string
          id: string
          invited_email: string
          role: string
          status: string
        }[]
      }
      goal_contribute: {
        Args: {
          p_amount: number
          p_date: string
          p_goal_id: string
          p_household_id: string
          p_notes?: string
          p_source_account_id: string
          p_transaction_id: string
          p_updated_at?: string
        }
        Returns: Json
      }
      goal_withdraw: {
        Args: {
          p_amount: number
          p_date: string
          p_destination_account_id: string
          p_goal_id: string
          p_household_id: string
          p_notes?: string
          p_transaction_id: string
          p_updated_at?: string
        }
        Returns: Json
      }
      household_role: { Args: { target_household_id: string }; Returns: string }
      is_household_member: {
        Args: { target_household_id: string }
        Returns: boolean
      }
      is_household_owner: {
        Args: { target_household_id: string }
        Returns: boolean
      }
      mark_finance_bill_paid: {
        Args: {
          p_bill_id: string
          p_household_id: string
          p_notes?: string
          p_payment_account_id: string
          p_payment_date: string
          p_transaction_id: string
          p_updated_at?: string
        }
        Returns: {
          amount: number
          archived_at: string | null
          category_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string
          frequency: string
          household_id: string
          id: string
          last_generated_date: string | null
          linked_transaction_id: string | null
          name: string
          next_due_date: string | null
          notes: string | null
          paid_at: string | null
          payment_account_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bills"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_finance_bill_unpaid: {
        Args: {
          p_bill_id: string
          p_household_id: string
          p_updated_at?: string
        }
        Returns: {
          amount: number
          archived_at: string | null
          category_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string
          frequency: string
          household_id: string
          id: string
          last_generated_date: string | null
          linked_transaction_id: string | null
          name: string
          next_due_date: string | null
          notes: string | null
          paid_at: string | null
          payment_account_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bills"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_finance_loan_payment: {
        Args: {
          p_account_id: string
          p_amount: number
          p_date: string
          p_household_id: string
          p_loan_id: string
          p_notes?: string
          p_transaction_id: string
          p_updated_at?: string
        }
        Returns: Json
      }
      revoke_household_invite: {
        Args: { p_invite_id: string }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          deleted_at: string | null
          expires_at: string | null
          household_id: string
          id: string
          invited_by: string | null
          invited_email: string
          role: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "household_invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_finance_bill: {
        Args: {
          p_amount: number
          p_bill_id: string
          p_category_id: string
          p_due_date: string
          p_frequency: string
          p_household_id: string
          p_name: string
          p_notes?: string
          p_updated_at?: string
        }
        Returns: {
          amount: number
          archived_at: string | null
          category_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string
          frequency: string
          household_id: string
          id: string
          last_generated_date: string | null
          linked_transaction_id: string | null
          name: string
          next_due_date: string | null
          notes: string | null
          paid_at: string | null
          payment_account_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bills"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_finance_goal: {
        Args: {
          p_color?: string
          p_current_amount: number
          p_goal_id: string
          p_household_id: string
          p_icon?: string
          p_name: string
          p_notes?: string
          p_priority?: string
          p_target_amount: number
          p_target_date?: string
          p_updated_at?: string
        }
        Returns: {
          archived_at: string | null
          color: string | null
          created_at: string
          created_by: string | null
          current_amount: number
          deleted_at: string | null
          household_id: string
          icon: string | null
          id: string
          name: string
          notes: string | null
          priority: string
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "goals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_finance_loan: {
        Args: {
          p_counterparty?: string
          p_due_date?: string
          p_household_id: string
          p_interest_rate?: number
          p_loan_id: string
          p_name: string
          p_notes?: string
          p_principal_amount?: number
          p_receiving_account_id?: string
          p_source_account_id?: string
          p_type: string
          p_updated_at?: string
        }
        Returns: {
          archived_at: string | null
          counterparty: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string | null
          household_id: string
          id: string
          interest_rate: number | null
          linked_transaction_id: string | null
          name: string
          notes: string | null
          outstanding_amount: number
          principal_amount: number
          receiving_account_id: string | null
          source_account_id: string | null
          status: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "loans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_finance_transaction: {
        Args: {
          p_allow_linked?: boolean
          p_amount: number
          p_category_id?: string
          p_date: string
          p_from_account_id?: string
          p_household_id: string
          p_linked_bill_id?: string
          p_linked_goal_id?: string
          p_linked_loan_id?: string
          p_linked_source_id?: string
          p_linked_source_type?: string
          p_notes?: string
          p_time?: string
          p_to_account_id?: string
          p_transaction_datetime?: string
          p_transaction_id: string
          p_type: string
          p_updated_at?: string
        }
        Returns: {
          amount: number
          archived_at: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          from_account_id: string | null
          household_id: string
          id: string
          linked_bill_id: string | null
          linked_goal_id: string | null
          linked_loan_id: string | null
          linked_source_id: string | null
          linked_source_type: string | null
          notes: string | null
          payment_method: string | null
          receipt_name: string | null
          receipt_path: string | null
          receipt_thumbnail: string | null
          tags: string[]
          time: string | null
          to_account_id: string | null
          transaction_datetime: string | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

