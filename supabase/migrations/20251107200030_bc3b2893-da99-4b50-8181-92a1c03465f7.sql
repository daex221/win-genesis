-- Enable realtime for wallets table
ALTER TABLE public.wallets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;