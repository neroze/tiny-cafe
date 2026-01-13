--
-- PostgreSQL database dump
--

\restrict X7wlhm6yy27XmQo1aAW9Qf6zMkWOF5m9F4EscsiYP1JQwfTDEiWqpzWCDB8jMgd

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.items (
    id integer NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    cost_price integer NOT NULL,
    selling_price integer NOT NULL,
    min_stock integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.items OWNER TO postgres;

--
-- Name: items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.items_id_seq OWNER TO postgres;

--
-- Name: items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.items_id_seq OWNED BY public.items.id;


--
-- Name: sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales (
    id integer NOT NULL,
    date timestamp without time zone DEFAULT now() NOT NULL,
    item_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price integer NOT NULL,
    total integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    labels text[] DEFAULT ARRAY[]::text[]
);


ALTER TABLE public.sales OWNER TO postgres;

--
-- Name: sales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_id_seq OWNER TO postgres;

--
-- Name: sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_id_seq OWNED BY public.sales.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: stock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock (
    id integer NOT NULL,
    date timestamp without time zone DEFAULT now() NOT NULL,
    item_id integer NOT NULL,
    opening_stock integer DEFAULT 0,
    purchased integer DEFAULT 0,
    sold integer DEFAULT 0,
    wastage integer DEFAULT 0,
    closing_stock integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.stock OWNER TO postgres;

--
-- Name: stock_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_id_seq OWNER TO postgres;

--
-- Name: stock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_id_seq OWNED BY public.stock.id;


--
-- Name: items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items ALTER COLUMN id SET DEFAULT nextval('public.items_id_seq'::regclass);


--
-- Name: sales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales ALTER COLUMN id SET DEFAULT nextval('public.sales_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: stock id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock ALTER COLUMN id SET DEFAULT nextval('public.stock_id_seq'::regclass);


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.items (id, name, category, cost_price, selling_price, min_stock, is_active, created_at) FROM stdin;
2	Espresso	Drinks	6000	15000	20	t	2026-01-07 08:05:20.87036
3	Chicken Sandwich	Main	15000	35000	10	t	2026-01-07 08:05:20.873801
4	Muffin	Snacks	5000	12000	15	t	2026-01-07 08:05:20.877134
1	Surya	Drinks	1100	2500	40	t	2026-01-07 08:05:20.84787
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales (id, date, item_id, quantity, unit_price, total, created_at, labels) FROM stdin;
1	2026-01-07 00:00:00	3	1	35000	35000	2026-01-07 11:54:52.11168	{}
2	2026-01-07 00:00:00	1	1	25000	25000	2026-01-07 17:37:22.593266	{}
3	2026-01-07 00:00:00	2	1	15000	15000	2026-01-07 17:37:27.07075	{}
4	2026-01-05 00:00:00	3	1	35000	35000	2026-01-07 17:37:35.868902	{}
5	2026-01-06 00:00:00	1	1	25000	25000	2026-01-07 17:37:46.901102	{}
6	2026-01-06 00:00:00	2	6	15000	90000	2026-01-07 17:37:55.217982	{}
7	2026-01-08 00:00:00	1	10	25000	250000	2026-01-07 17:38:06.687664	{}
8	2026-01-08 00:00:00	1	7	25000	175000	2026-01-08 06:25:46.338419	{}
9	2026-01-09 00:00:00	3	1	35000	35000	2026-01-09 05:19:07.39921	{}
10	2026-01-09 00:00:00	3	1	35000	35000	2026-01-09 05:19:21.066957	{foc}
11	2026-01-09 00:00:00	2	1	15000	15000	2026-01-09 05:19:48.799723	{niraj,foc}
12	2026-01-09 00:00:00	3	1	35000	35000	2026-01-09 05:25:36.982637	{raby,foc}
13	2026-01-09 00:00:00	1	1	2500	2500	2026-01-09 08:17:05.794699	{FOC}
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (id, key, value, updated_at) FROM stdin;
1	configured_labels	["niraj","FOC","raby","sachit"]	2026-01-09 05:30:47.378
2	configured_categories	["Snacks","Drinks","Main","Smoke"]	2026-01-09 08:23:05.968441
3	target_weekly	1550000	2026-01-09 08:23:55.026538
4	target_monthly	6670000	2026-01-09 08:23:55.042954
5	target_quarterly	20000000	2026-01-09 08:23:55.050196
\.


--
-- Data for Name: stock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock (id, date, item_id, opening_stock, purchased, sold, wastage, closing_stock, created_at) FROM stdin;
1	2026-01-07 08:16:26.537	3	0	30	1	0	29	2026-01-07 08:16:27.555659
2	2026-01-07 00:00:00	1	0	0	1	0	-1	2026-01-07 17:37:22.624318
3	2026-01-07 00:00:00	2	0	0	1	0	-1	2026-01-07 17:37:27.075279
4	2026-01-05 00:00:00	3	0	0	1	0	-1	2026-01-07 17:37:35.874561
5	2026-01-06 00:00:00	1	0	0	1	0	-1	2026-01-07 17:37:46.906235
6	2026-01-06 00:00:00	2	0	0	6	0	-6	2026-01-07 17:37:55.242396
7	2026-01-08 00:00:00	1	0	50	17	0	33	2026-01-07 17:38:06.692005
9	2026-01-09 00:00:00	2	0	0	1	0	-1	2026-01-09 05:19:48.822419
8	2026-01-09 00:00:00	3	0	0	3	0	-3	2026-01-09 05:19:07.413914
10	2026-01-09 00:00:00	1	0	0	1	0	-1	2026-01-09 08:17:05.801994
\.


--
-- Name: items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.items_id_seq', 4, true);


--
-- Name: sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_id_seq', 13, true);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.settings_id_seq', 5, true);


--
-- Name: stock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_id_seq', 10, true);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_unique UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: stock stock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock
    ADD CONSTRAINT stock_pkey PRIMARY KEY (id);


--
-- Name: sales sales_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: stock stock_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock
    ADD CONSTRAINT stock_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- PostgreSQL database dump complete
--

\unrestrict X7wlhm6yy27XmQo1aAW9Qf6zMkWOF5m9F4EscsiYP1JQwfTDEiWqpzWCDB8jMgd

