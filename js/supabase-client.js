const SUPABASE_URL = 'https://cirehozaslu.beget.app';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkwODEyODAwLCJleHAiOjE5NDg1NzkyMDB9.l94nPyT_jlM7LuecPw0W4IFcL4nZwRw11CkEBE9xkEw';

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);