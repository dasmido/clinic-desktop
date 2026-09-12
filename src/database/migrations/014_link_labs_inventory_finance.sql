ALTER TABLE lab_orders
  ADD COLUMN inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL;

ALTER TABLE financial_transactions
  ADD COLUMN patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
  ADD COLUMN lab_order_id INTEGER REFERENCES lab_orders(id) ON DELETE SET NULL;
