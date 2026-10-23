-- Migration: Add transaction_reference, final_amount_override, calculated_amount
-- Run this in your Supabase SQL Editor if you have a real Supabase project.
-- (Demo mode works without this — these columns are handled in demoClient.js)

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS transaction_reference  TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS final_amount_override  NUMERIC(12,2)        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS calculated_amount      NUMERIC(12,2)        DEFAULT NULL;

-- Update the create_invoice RPC to accept and store the new fields.
-- Replace the existing function body:
CREATE OR REPLACE FUNCTION create_invoice(
  p_customer_id           UUID,
  p_customer_name         TEXT,
  p_customer_mobile       TEXT,
  p_customer_email        TEXT,
  p_customer_address      TEXT,
  p_subtotal              NUMERIC,
  p_discount_amount       NUMERIC,
  p_tax_amount            NUMERIC,
  p_total_amount          NUMERIC,
  p_payment_method        TEXT,
  p_payment_status        TEXT,
  p_notes                 TEXT,
  p_transaction_reference TEXT    DEFAULT '',
  p_final_amount_override NUMERIC DEFAULT NULL,
  p_calculated_amount     NUMERIC DEFAULT NULL,
  p_items                 JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id   UUID;
  v_inv_number   TEXT;
  v_item         JSONB;
  v_result       JSONB;
BEGIN
  -- Atomic invoice number
  SELECT next_invoice_number() INTO v_inv_number;
  v_invoice_id := gen_random_uuid();

  INSERT INTO invoices (
    id, user_id, invoice_number,
    customer_id, customer_name, customer_mobile, customer_email, customer_address,
    subtotal, discount_amount, tax_amount, total_amount,
    payment_method, payment_status, status, notes,
    transaction_reference, final_amount_override, calculated_amount
  ) VALUES (
    v_invoice_id, auth.uid(), v_inv_number,
    p_customer_id, p_customer_name, p_customer_mobile, p_customer_email, p_customer_address,
    p_subtotal, p_discount_amount, p_tax_amount, p_total_amount,
    p_payment_method, p_payment_status, 'completed', p_notes,
    COALESCE(p_transaction_reference, ''),
    p_final_amount_override,
    COALESCE(p_calculated_amount, p_total_amount)
  );

  -- Insert line items + decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO invoice_items (
      id, user_id, invoice_id,
      product_id, variant_id, product_name, sku, size, color,
      quantity, unit_price, discount_amount, total_amount
    ) VALUES (
      gen_random_uuid(), auth.uid(), v_invoice_id,
      (v_item->>'product_id')::UUID,
      NULLIF(v_item->>'variant_id', '')::UUID,
      v_item->>'product_name', v_item->>'sku',
      v_item->>'size', v_item->>'color',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'discount_amount')::NUMERIC,
      (v_item->>'total_amount')::NUMERIC
    );

    -- Decrement product stock
    UPDATE products
    SET stock_quantity = GREATEST(stock_quantity - (v_item->>'quantity')::INTEGER, 0),
        updated_at = NOW()
    WHERE id = (v_item->>'product_id')::UUID AND user_id = auth.uid();

    -- Decrement variant stock if applicable
    IF v_item->>'variant_id' IS NOT NULL AND v_item->>'variant_id' != '' THEN
      UPDATE product_variants
      SET stock_quantity = GREATEST(stock_quantity - (v_item->>'quantity')::INTEGER, 0),
          updated_at = NOW()
      WHERE id = (v_item->>'variant_id')::UUID AND user_id = auth.uid();
    END IF;

    -- Inventory transaction record
    INSERT INTO inventory_transactions (
      id, user_id, product_id, variant_id, change, previous_qty, new_qty,
      reason, notes, invoice_id, created_by
    )
    SELECT
      gen_random_uuid(), auth.uid(),
      (v_item->>'product_id')::UUID,
      NULLIF(v_item->>'variant_id', '')::UUID,
      -(v_item->>'quantity')::INTEGER,
      stock_quantity + (v_item->>'quantity')::INTEGER,
      stock_quantity,
      'sale', CONCAT('Sale — ', v_inv_number),
      v_invoice_id, auth.uid()
    FROM products WHERE id = (v_item->>'product_id')::UUID AND user_id = auth.uid();
  END LOOP;

  -- Update customer aggregates
  IF p_customer_id IS NOT NULL THEN
    UPDATE customers
    SET total_purchases = total_purchases + p_total_amount,
        total_orders    = total_orders + 1,
        last_purchase_at = NOW(),
        updated_at = NOW()
    WHERE id = p_customer_id AND user_id = auth.uid();
  END IF;

  -- Payment record
  INSERT INTO payments (id, user_id, invoice_id, amount, method, reference, notes, paid_at)
  VALUES (gen_random_uuid(), auth.uid(), v_invoice_id, p_total_amount, p_payment_method,
          COALESCE(p_transaction_reference, ''), '', NOW());

  -- Activity log
  INSERT INTO activity_log (id, user_id, action_type, entity_type, entity_id, description)
  VALUES (gen_random_uuid(), auth.uid(), 'invoice_created', 'invoice', v_invoice_id::TEXT,
          CONCAT('Invoice ', v_inv_number, ' generated for ', p_customer_name));

  -- Return the created invoice row as JSONB
  SELECT to_jsonb(i) INTO v_result FROM invoices i WHERE id = v_invoice_id;
  RETURN v_result;
END;
$$;
