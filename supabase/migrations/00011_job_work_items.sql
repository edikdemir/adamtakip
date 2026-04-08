-- job_work_items tablosu (3. katman: İş Tipi → Alt Tip → Yapılacak İş)
CREATE TABLE IF NOT EXISTS job_work_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_sub_type_id UUID NOT NULL REFERENCES job_sub_types(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(job_sub_type_id, name)
);

CREATE INDEX IF NOT EXISTS idx_job_work_items_sub_type ON job_work_items(job_sub_type_id);

-- Eski veriyi temizle (onay alındı: "tüm verileri silebilirsin")
TRUNCATE job_types CASCADE;

-- ─── Job Types ───────────────────────────────────────────────────────────────
INSERT INTO job_types (id, name, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Steel',      1),
  ('10000000-0000-0000-0000-000000000002', 'Outfitting',  2),
  ('10000000-0000-0000-0000-000000000003', 'List',        3),
  ('10000000-0000-0000-0000-000000000004', 'Machinery',   4);

-- ─── Steel sub-types (8 adet, work item yok) ─────────────────────────────────
INSERT INTO job_sub_types (id, job_type_id, name, sort_order) VALUES
  ('20000001-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Block Model',        1),
  ('20000001-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Block Assembly',     2),
  ('20000001-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','Block Documentation',3),
  ('20000001-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','Block Nesting',      4),
  ('20000001-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','Block Control',      5),
  ('20000001-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000001','Block Revision',     6),
  ('20000001-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000001','Asbuilt',            7),
  ('20000001-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000001','Lifting Eyes',       8);

-- ─── Outfitting sub-types (5 adet, work item yok) ────────────────────────────
INSERT INTO job_sub_types (id, job_type_id, name, sort_order) VALUES
  ('20000002-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','General Outfitting', 1),
  ('20000002-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Foundation',         2),
  ('20000002-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','Foundation Model',   3),
  ('20000002-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','Outfitting Revision',4),
  ('20000002-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002','Asbuilt',            5);

-- ─── List sub-types (1 adet) ─────────────────────────────────────────────────
INSERT INTO job_sub_types (id, job_type_id, name, sort_order) VALUES
  ('20000003-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','List', 1);

-- ─── Machinery sub-types (7 adet) ────────────────────────────────────────────
INSERT INTO job_sub_types (id, job_type_id, name, sort_order) VALUES
  ('20000004-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004','3D Model', 1),
  ('20000004-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000004','Arr',      2),
  ('20000004-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000004','Axo',      3),
  ('20000004-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000004','Electro',  4),
  ('20000004-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000004','Iso',      5),
  ('20000004-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000004','MatList',  6),
  ('20000004-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000004','Compro',   7);

-- ─── Work items: List → List (12 adet) ───────────────────────────────────────
INSERT INTO job_work_items (job_sub_type_id, name, sort_order) VALUES
  ('20000003-0000-0000-0000-000000000001','Compansator',            1),
  ('20000003-0000-0000-0000-000000000001','Compartment Check',      2),
  ('20000003-0000-0000-0000-000000000001','Gooseneck',              3),
  ('20000003-0000-0000-0000-000000000001','Instrument on Pipeline', 4),
  ('20000003-0000-0000-0000-000000000001','Insulation Mto',         5),
  ('20000003-0000-0000-0000-000000000001','Penetration',            6),
  ('20000003-0000-0000-0000-000000000001','Pipe Roxtec',            7),
  ('20000003-0000-0000-0000-000000000001','Piping Mto',             8),
  ('20000003-0000-0000-0000-000000000001','Tank Heat Treatment',    9),
  ('20000003-0000-0000-0000-000000000001','Tank Sensor',           10),
  ('20000003-0000-0000-0000-000000000001','Valve',                 11),
  ('20000003-0000-0000-0000-000000000001','Weight & Cog',          12);

-- ─── Work items: Machinery → 3D Model (50 adet) ──────────────────────────────
INSERT INTO job_work_items (job_sub_type_id, name, sort_order) VALUES
  ('20000004-0000-0000-0000-000000000001','Bottom Plug',                                                                  1),
  ('20000004-0000-0000-0000-000000000001','Ceiling',                                                                      2),
  ('20000004-0000-0000-0000-000000000001','Doubler Plate',                                                                3),
  ('20000004-0000-0000-0000-000000000001','External Railing',                                                             4),
  ('20000004-0000-0000-0000-000000000001','Floor',                                                                        5),
  ('20000004-0000-0000-0000-000000000001','Insulation',                                                                   6),
  ('20000004-0000-0000-0000-000000000001','Lining',                                                                       7),
  ('20000004-0000-0000-0000-000000000001','Switches&Sockets',                                                             8),
  ('20000004-0000-0000-0000-000000000001','Equipment',                                                                    9),
  ('20000004-0000-0000-0000-000000000001','Manhole',                                                                     10),
  ('20000004-0000-0000-0000-000000000001','Stair',                                                                       11),
  ('20000004-0000-0000-0000-000000000001','Furniture',                                                                   12),
  ('20000004-0000-0000-0000-000000000001','Vertical Ladder',                                                             13),
  ('20000004-0000-0000-0000-000000000001','Door',                                                                        14),
  ('20000004-0000-0000-0000-000000000001','Window',                                                                      15),
  ('20000004-0000-0000-0000-000000000001','Anti heeling system',                                                         16),
  ('20000004-0000-0000-0000-000000000001','Ballast System',                                                              17),
  ('20000004-0000-0000-0000-000000000001','Bilge System',                                                                18),
  ('20000004-0000-0000-0000-000000000001','Chilled Water & Hot Water System',                                            19),
  ('20000004-0000-0000-0000-000000000001','Compressed air system (Starting air. / Working air & Instrument air)',        20),
  ('20000004-0000-0000-0000-000000000001','Deep FAT Fryer Fire Fighting System',                                         21),
  ('20000004-0000-0000-0000-000000000001','Drain Pipes System',                                                          22),
  ('20000004-0000-0000-0000-000000000001','Exhaust System',                                                              23),
  ('20000004-0000-0000-0000-000000000001','Fire&Deckwash System',                                                        24),
  ('20000004-0000-0000-0000-000000000001','FO Supply System',                                                            25),
  ('20000004-0000-0000-0000-000000000001','FO tanks vent / overflow system',                                             26),
  ('20000004-0000-0000-0000-000000000001','FO Transfer System',                                                          27),
  ('20000004-0000-0000-0000-000000000001','FW cooling system for main propulsion',                                       28),
  ('20000004-0000-0000-0000-000000000001','FW cooling system main generators',                                           29),
  ('20000004-0000-0000-0000-000000000001','FW cooling system misc. Equipment',                                           30),
  ('20000004-0000-0000-0000-000000000001','FW Transfer System',                                                          31),
  ('20000004-0000-0000-0000-000000000001','Galley CO2 System',                                                           32),
  ('20000004-0000-0000-0000-000000000001','Heat Recovery System',                                                        33),
  ('20000004-0000-0000-0000-000000000001','High Pressure Hydraulic Pipes',                                               34),
  ('20000004-0000-0000-0000-000000000001','HP cleaning system',                                                          35),
  ('20000004-0000-0000-0000-000000000001','Hydrophore System',                                                           36),
  ('20000004-0000-0000-0000-000000000001','LO system',                                                                   37),
  ('20000004-0000-0000-0000-000000000001','Low Pressure Hydraulic Pipes (64bar)',                                        38),
  ('20000004-0000-0000-0000-000000000001','Oil drain system',                                                            39),
  ('20000004-0000-0000-0000-000000000001','Sanitary Discharge System',                                                   40),
  ('20000004-0000-0000-0000-000000000001','Sanitary Supply System',                                                      41),
  ('20000004-0000-0000-0000-000000000001','Sewage System',                                                               42),
  ('20000004-0000-0000-0000-000000000001','Tank sounding system, manual',                                                43),
  ('20000004-0000-0000-0000-000000000001','Tank sounding system, remote',                                                44),
  ('20000004-0000-0000-0000-000000000001','Tank ventilation system',                                                     45),
  ('20000004-0000-0000-0000-000000000001','Urea System',                                                                 46),
  ('20000004-0000-0000-0000-000000000001','Ventilation System Inside Accommodation',                                     47),
  ('20000004-0000-0000-0000-000000000001','Ventilation System Outside Accommodation',                                    48),
  ('20000004-0000-0000-0000-000000000001','Water Mist System',                                                           49),
  ('20000004-0000-0000-0000-000000000001','Window Flushing System',                                                      50);

-- ─── Work items: Machinery → Arr (28 adet) ───────────────────────────────────
INSERT INTO job_work_items (job_sub_type_id, name, sort_order) VALUES
  ('20000004-0000-0000-0000-000000000002','Bottom Plug',                                                                  1),
  ('20000004-0000-0000-0000-000000000002','Cableway',                                                                     2),
  ('20000004-0000-0000-0000-000000000002','Chilled Water & Hot Water System',                                             3),
  ('20000004-0000-0000-0000-000000000002','Compressed air system (Starting air. / Working air & Instrument air)',         4),
  ('20000004-0000-0000-0000-000000000002','Deep FAT Fryer Fire Fighting System',                                          5),
  ('20000004-0000-0000-0000-000000000002','Doubler Plate',                                                                6),
  ('20000004-0000-0000-0000-000000000002','FO Transfer System',                                                           7),
  ('20000004-0000-0000-0000-000000000002','Galley CO2 System',                                                            8),
  ('20000004-0000-0000-0000-000000000002','High Pressure Hydraulic Pipes',                                                9),
  ('20000004-0000-0000-0000-000000000002','HP cleaning system',                                                          10),
  ('20000004-0000-0000-0000-000000000002','Hydrophore System',                                                           11),
  ('20000004-0000-0000-0000-000000000002','Compartment Layout',                                                          12),
  ('20000004-0000-0000-0000-000000000002','Low Pressure Hydraulic Pipes',                                                13),
  ('20000004-0000-0000-0000-000000000002','Oil drain system',                                                            14),
  ('20000004-0000-0000-0000-000000000002','Overboard',                                                                   15),
  ('20000004-0000-0000-0000-000000000002','Remote Valve',                                                                16),
  ('20000004-0000-0000-0000-000000000002','Sanitary Discharge System',                                                   17),
  ('20000004-0000-0000-0000-000000000002','Sanitary Supply System',                                                      18),
  ('20000004-0000-0000-0000-000000000002','Sewage System',                                                               19),
  ('20000004-0000-0000-0000-000000000002','Switches&Sockets',                                                            20),
  ('20000004-0000-0000-0000-000000000002','Tank sounding system, manual',                                                21),
  ('20000004-0000-0000-0000-000000000002','Ventilation System Inside Accommodation',                                     22),
  ('20000004-0000-0000-0000-000000000002','Ventilation System Outside Accommodation',                                    23),
  ('20000004-0000-0000-0000-000000000002','Window Flushing System',                                                      24),
  ('20000004-0000-0000-0000-000000000002','WT Bulkhead',                                                                 25),
  ('20000004-0000-0000-0000-000000000002','Tank Connection Drawing',                                                     26),
  ('20000004-0000-0000-0000-000000000002','Cableway Penetrations',                                                       27),
  ('20000004-0000-0000-0000-000000000002','Cut-outs and Roxtec',                                                         28);

-- ─── Work items: Machinery → Axo (25 adet) ───────────────────────────────────
INSERT INTO job_work_items (job_sub_type_id, name, sort_order) VALUES
  ('20000004-0000-0000-0000-000000000003','Anti heeling system',                       1),
  ('20000004-0000-0000-0000-000000000003','Ballast System',                            2),
  ('20000004-0000-0000-0000-000000000003','Bilge System',                              3),
  ('20000004-0000-0000-0000-000000000003','Chilled Water & Hot Water System',          4),
  ('20000004-0000-0000-0000-000000000003','Drain Pipes System',                        5),
  ('20000004-0000-0000-0000-000000000003','Exhaust System',                            6),
  ('20000004-0000-0000-0000-000000000003','Fire&Deckwash System',                      7),
  ('20000004-0000-0000-0000-000000000003','FO Supply System',                          8),
  ('20000004-0000-0000-0000-000000000003','FO tanks vent / overflow system',           9),
  ('20000004-0000-0000-0000-000000000003','FO Transfer System',                       10),
  ('20000004-0000-0000-0000-000000000003','FW cooling system main generators',        11),
  ('20000004-0000-0000-0000-000000000003','FW cooling system misc. Equipment',        12),
  ('20000004-0000-0000-0000-000000000003','FW Transfer System',                       13),
  ('20000004-0000-0000-0000-000000000003','Heat Recovery System',                     14),
  ('20000004-0000-0000-0000-000000000003','Hydrophore System',                        15),
  ('20000004-0000-0000-0000-000000000003','LO system',                                16),
  ('20000004-0000-0000-0000-000000000003','Sanitary Discharge System',                17),
  ('20000004-0000-0000-0000-000000000003','Sewage System',                            18),
  ('20000004-0000-0000-0000-000000000003','Tank sounding system, manual',             19),
  ('20000004-0000-0000-0000-000000000003','Tank sounding system, remote',             20),
  ('20000004-0000-0000-0000-000000000003','Tank ventilation system',                  21),
  ('20000004-0000-0000-0000-000000000003','Transfer System',                          22),
  ('20000004-0000-0000-0000-000000000003','Urea System',                              23),
  ('20000004-0000-0000-0000-000000000003','Ventilation System Outside Accommodation', 24),
  ('20000004-0000-0000-0000-000000000003','Water Mist System',                        25);

-- ─── Work items: Machinery → Electro (2 adet) ────────────────────────────────
INSERT INTO job_work_items (job_sub_type_id, name, sort_order) VALUES
  ('20000004-0000-0000-0000-000000000004','Main',      1),
  ('20000004-0000-0000-0000-000000000004','Secondary', 2);

-- ─── Work items: Machinery → Iso (25 adet) ───────────────────────────────────
INSERT INTO job_work_items (job_sub_type_id, name, sort_order) VALUES
  ('20000004-0000-0000-0000-000000000005','Anti heeling system',                       1),
  ('20000004-0000-0000-0000-000000000005','Ballast System',                            2),
  ('20000004-0000-0000-0000-000000000005','Bilge System',                              3),
  ('20000004-0000-0000-0000-000000000005','Chilled Water & Hot Water System',          4),
  ('20000004-0000-0000-0000-000000000005','Drain Pipes System',                        5),
  ('20000004-0000-0000-0000-000000000005','Exhaust System',                            6),
  ('20000004-0000-0000-0000-000000000005','Fire&Deckwash System',                      7),
  ('20000004-0000-0000-0000-000000000005','FO Supply System',                          8),
  ('20000004-0000-0000-0000-000000000005','FO tanks vent / overflow system',           9),
  ('20000004-0000-0000-0000-000000000005','FO Transfer System',                       10),
  ('20000004-0000-0000-0000-000000000005','FW cooling system for main propulsion',    11),
  ('20000004-0000-0000-0000-000000000005','FW cooling system main generators',        12),
  ('20000004-0000-0000-0000-000000000005','FW cooling system misc. Equipment',        13),
  ('20000004-0000-0000-0000-000000000005','FW Transfer System',                       14),
  ('20000004-0000-0000-0000-000000000005','Heat Recovery System',                     15),
  ('20000004-0000-0000-0000-000000000005','Hydrophore System',                        16),
  ('20000004-0000-0000-0000-000000000005','LO system',                                17),
  ('20000004-0000-0000-0000-000000000005','Sanitary Discharge System',                18),
  ('20000004-0000-0000-0000-000000000005','Sewage System',                            19),
  ('20000004-0000-0000-0000-000000000005','Tank sounding system, manual',             20),
  ('20000004-0000-0000-0000-000000000005','Tank sounding system, remote',             21),
  ('20000004-0000-0000-0000-000000000005','Tank ventilation system',                  22),
  ('20000004-0000-0000-0000-000000000005','Urea System',                              23),
  ('20000004-0000-0000-0000-000000000005','Ventilation System Outside Accommodation', 24),
  ('20000004-0000-0000-0000-000000000005','Water Mist System',                        25);

-- ─── Work items: Machinery → MatList (35 adet) ───────────────────────────────
INSERT INTO job_work_items (job_sub_type_id, name, sort_order) VALUES
  ('20000004-0000-0000-0000-000000000006','Anti heeling system',                                                          1),
  ('20000004-0000-0000-0000-000000000006','Ballast System',                                                               2),
  ('20000004-0000-0000-0000-000000000006','Bilge System',                                                                 3),
  ('20000004-0000-0000-0000-000000000006','Chilled Water & Hot Water System',                                             4),
  ('20000004-0000-0000-0000-000000000006','Compressed air system (Starting air. / Working air & Instrument air)',         5),
  ('20000004-0000-0000-0000-000000000006','Deep FAT Fryer Fire Fighting System',                                          6),
  ('20000004-0000-0000-0000-000000000006','Drain Pipes System',                                                           7),
  ('20000004-0000-0000-0000-000000000006','Exhaust System',                                                               8),
  ('20000004-0000-0000-0000-000000000006','Fire&Deckwash System',                                                         9),
  ('20000004-0000-0000-0000-000000000006','FO Supply System',                                                            10),
  ('20000004-0000-0000-0000-000000000006','FO tanks vent / overflow system',                                             11),
  ('20000004-0000-0000-0000-000000000006','FO Transfer System',                                                          12),
  ('20000004-0000-0000-0000-000000000006','FW cooling system main generators',                                           13),
  ('20000004-0000-0000-0000-000000000006','FW cooling system misc. Equipment',                                           14),
  ('20000004-0000-0000-0000-000000000006','FW Transfer System',                                                          15),
  ('20000004-0000-0000-0000-000000000006','Galley CO2 System',                                                           16),
  ('20000004-0000-0000-0000-000000000006','Heat Recovery System',                                                        17),
  ('20000004-0000-0000-0000-000000000006','High Pressure Hydraulic Pipes',                                               18),
  ('20000004-0000-0000-0000-000000000006','HP cleaning system',                                                          19),
  ('20000004-0000-0000-0000-000000000006','Hydrophore System',                                                           20),
  ('20000004-0000-0000-0000-000000000006','LO system',                                                                   21),
  ('20000004-0000-0000-0000-000000000006','Low Pressure Hydraulic Pipes (64bar)',                                        22),
  ('20000004-0000-0000-0000-000000000006','Oil drain system',                                                            23),
  ('20000004-0000-0000-0000-000000000006','Sanitary Discharge System',                                                   24),
  ('20000004-0000-0000-0000-000000000006','Sanitary Supply System',                                                      25),
  ('20000004-0000-0000-0000-000000000006','Sewage System',                                                               26),
  ('20000004-0000-0000-0000-000000000006','Tank sounding system, manual',                                                27),
  ('20000004-0000-0000-0000-000000000006','Tank sounding system, remote',                                                28),
  ('20000004-0000-0000-0000-000000000006','Tank ventilation system',                                                     29),
  ('20000004-0000-0000-0000-000000000006','Transfer System',                                                             30),
  ('20000004-0000-0000-0000-000000000006','Urea System',                                                                 31),
  ('20000004-0000-0000-0000-000000000006','Ventilation System Inside Accommodation',                                     32),
  ('20000004-0000-0000-0000-000000000006','Ventilation System Outside Accommodation',                                    33),
  ('20000004-0000-0000-0000-000000000006','Water Mist System',                                                           34),
  ('20000004-0000-0000-0000-000000000006','Window Flushing System',                                                      35);

-- ─── Work items: Machinery → Compro (4 adet) ─────────────────────────────────
INSERT INTO job_work_items (job_sub_type_id, name, sort_order) VALUES
  ('20000004-0000-0000-0000-000000000007','Alarm Box',     1),
  ('20000004-0000-0000-0000-000000000007','Drainage Well', 2),
  ('20000004-0000-0000-0000-000000000007','Grease Trap',   3),
  ('20000004-0000-0000-0000-000000000007','Expansion Tank',4);
