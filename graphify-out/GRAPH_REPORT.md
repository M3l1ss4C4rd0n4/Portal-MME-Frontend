# Graph Report - portal-direccion-mme  (2026-05-04)

## Corpus Check
- 163 files · ~526,260 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1460 nodes · 2236 edges · 44 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 163 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]

## God Nodes (most connected - your core abstractions)
1. `XMLEditor` - 61 edges
2. `BaseSchemaValidator` - 40 edges
3. `error()` - 34 edges
4. `Document` - 32 edges
5. `set()` - 29 edges
6. `_pop_flag()` - 24 edges
7. `run_qa()` - 18 edges
8. `DocxXMLEditor` - 18 edges
9. `check_file()` - 17 edges
10. `check_docx()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `backendGet()`  [INFERRED]
  src/app/api/sector/route.ts → src/lib/backendClient.ts
- `GET()` --calls--> `getPool()`  [INFERRED]
  src/app/api/sector/detalle/route.ts → src/lib/db.ts
- `GET()` --calls--> `backendGet()`  [INFERRED]
  src/app/api/subsidios/route.ts → src/lib/backendClient.ts
- `GET()` --calls--> `getPool()`  [INFERRED]
  src/app/api/subsidios/deficit-historico/route.ts → src/lib/db.ts
- `GET()` --calls--> `getPool()`  [INFERRED]
  src/app/api/cu-evolucion/route.ts → src/lib/db.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (185): _best_font_for_char(), check_file(), check_missing_glyphs(), _classify_field(), _classify_lines(), cmd(), code_sanitize(), content_sanitize() (+177 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (75): BaseSchemaValidator, set(), check_blank_pages(), check_cover_overflow(), check_font_fallback(), check_heading_levels(), check_image_aspect_ratio(), check_image_overflow() (+67 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (68): _condense_xml(), Document, DocxXMLEditor, _generate_hex_id(), _generate_rsid(), _pack_document(), Add people.xml relationship to document.xml.rels if not already present., Initialize with required RSID and optional author.          Args:             xm (+60 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (76): BarChart(), LineChart(), PieChart(), align_header(), align_title(), _apply(), apply_chart_colors(), apply_pie_colors() (+68 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (76): _assign_floating_meta(), audit_cascade_palette(), audit_palette(), _auto_assign_grid_areas(), calculate_layout(), _cascade_to_css(), _cascade_to_reportlab(), compile_blueprint() (+68 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (42): BM25, detect_domain(), _load_csv(), Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query, Load CSV and return list of dicts, Core search function using BM25 (+34 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (55): check_conversion(), check_docx(), check_pdf(), check_run_hint_style(), check_toc_has_content(), _detect_language(), docx_has_toc_field(), find_toc_field_boundaries() (+47 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (47): analyzeChartImage(), analyzeMultipleStocks(), analyzeStock(), buildDashboardPrompt(), buildReportPrompt(), extractVerdict(), detectMarket(), fetchGlobalMacro() (+39 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (38): BaseHTTPRequestHandler, build_run(), embed_file(), find_runs(), _find_runs_recursive(), generate_html(), get_mime_type(), _kill_port() (+30 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (33): _collect_shapes(), _collect_shapes_from_slide(), _detect_overlaps(), extract_text_inventory(), _is_cjk(), _is_valid_shape(), _layout_font_size(), main() (+25 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (36): handler(), auto_fit_columns(), Auto-fit column widths based on DATA content (not header).     Headers that exce, _aggregate(), cell_ref(), _check_charts(), cmd(), cmd_audit() (+28 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (32): check_blank_pages(), check_colors(), check_content_fill_ratio(), check_cover_bleed(), check_font_embedding(), check_formula_overflow(), check_helvetica_in_cjk(), check_last_page_fill() (+24 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (19): CharacterProfile, ConsistencyChecker, ConsistencyIssue, main(), Load all character profiles from the project, Check character mentions in content for inconsistencies, Represents a consistency issue found in the story, Check for inconsistent character relationships (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (18): main(), Extract character names from explicit character markers, Find mentions of known characters in content, Parse a chapter/scene file for timeline events, Analyze entire project and build timeline, Represents a single event in the story timeline, Group events by their timepoint, Group events by character appearance (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (27): HTMLParser, _best_generic(), check_html(), check_pdf(), check_tex(), _contrast_ratio(), _extract_color(), _has_generic() (+19 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (11): GET(), GET(), GET(), GET(), BackendError, backendGet(), GET(), GET() (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (19): add_toc_placeholders(), _detect_toc_styles(), _ensure_hyperlink_style(), _ensure_toc_styles(), _extract_headings_from_docx(), _fix_fld_char_structure(), _fix_heading_outline_levels(), _fix_update_fields() (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.23
Nodes (16): addBackground(), addElements(), applyEmphasisFont(), calculateWidthCompensation(), checkCharCount(), checkElementBounds(), checkMinFontSize(), checkTextOverlaps() (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (8): describeArc(), estadoGeneracion(), estadoI2Hidro(), estadoI3Termica(), estadoPrecio(), KpiBlock(), polarToCartesian(), getTrendColor()

### Community 19 - "Community 19"
Cohesion: 0.21
Nodes (15): ApiError, apiGet(), fetchComunidades(), fetchContratosOR(), fetchCU(), fetchCUEvolucion(), fetchFenoge(), fetchNoticias() (+7 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (15): convert_to_images(), create_grid(), create_grids(), create_hidden_slide_placeholder(), get_placeholder_regions(), main(), _pdf_to_images(), _pptx_to_pdf() (+7 more)

### Community 21 - "Community 21"
Cohesion: 0.24
Nodes (15): buildPrompts(), callZAI(), charBudget(), chooseDurationMinutes(), countNonWsChars(), ensureSilenceWav(), joinWavsWave(), main() (+7 more)

### Community 22 - "Community 22"
Cohesion: 0.16
Nodes (9): GET(), GET(), GET(), getPool(), validateEnv(), GET(), toNum(), buildWhere() (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.24
Nodes (11): aggregate_results(), calculate_stats(), generate_benchmark(), generate_markdown(), load_run_results(), main(), Aggregate run results into summary statistics.      Returns run_summary with sta, Generate complete benchmark.json from run results. (+3 more)

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (9): collectStats(), convert(), loadPdfLib(), loadPlaywright(), postProcess(), preRenderHooks(), prettyBytes(), resolveChromium() (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.2
Nodes (3): Header(), useTheme(), MapaColombia()

### Community 26 - "Community 26"
Cohesion: 0.31
Nodes (4): estadoGeneracion(), estadoI2Hidro(), estadoI3Termica(), estadoPrecio()

### Community 27 - "Community 27"
Cohesion: 0.28
Nodes (7): main(), package_skill(), Check if a path should be excluded from packaging., Package a skill folder into a .skill file.      Args:         skill_path: Path t, should_exclude(), Basic validation of a skill, validate_skill()

### Community 28 - "Community 28"
Cohesion: 0.36
Nodes (7): condense_xml(), main(), pack_document(), Strip unnecessary whitespace and remove comments., Pack a directory into an Office file (.docx/.pptx/.xlsx).      Args:         inp, Validate document by converting to HTML with soffice., validate_document()

### Community 29 - "Community 29"
Cohesion: 0.54
Nodes (7): build_payload(), call_api(), _clean(), load_config(), main(), render_markdown(), _truncate()

### Community 30 - "Community 30"
Cohesion: 0.38
Nodes (6): check_library(), list_examples(), prune_oldest(), List all blog examples sorted by date (oldest first)., Check library status and recommend pruning if needed., Remove the oldest examples to bring library under limit.

### Community 31 - "Community 31"
Cohesion: 0.52
Nodes (6): build_parser(), _cast(), collect_arguments(), invoke(), load_config(), main()

### Community 32 - "Community 32"
Cohesion: 0.4
Nodes (2): calcularSemafotoPorDepto(), getEmbalseColor()

### Community 33 - "Community 33"
Cohesion: 0.6
Nodes (5): create(), createFromImage(), displayResult(), main(), query()

### Community 34 - "Community 34"
Cohesion: 0.47
Nodes (5): generate_visual(), get_script_path(), main(), Get the path to the appropriate generation script., Generate a single visual using the appropriate tool.

### Community 35 - "Community 35"
Cohesion: 0.47
Nodes (5): main(), pretty_print_xml(), Unpack an Office file into a directory and pretty-print all XML files., Pretty-print a single XML file in place., unpack_document()

### Community 37 - "Community 37"
Cohesion: 0.6
Nodes (4): copy_slide(), main(), Append a copy of slide[index] from src_prs into dst_prs., rearrange_presentation()

### Community 38 - "Community 38"
Cohesion: 0.7
Nodes (4): dimToPx(), main(), parseArgs(), resolveChromium()

### Community 45 - "Community 45"
Cohesion: 0.67
Nodes (3): generate_html(), main(), Generate HTML report from loop output data. If auto_refresh is True, adds a meta

### Community 46 - "Community 46"
Cohesion: 0.83
Nodes (3): main(), parseArgs(), resolveChromium()

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (2): describeArc(), polarToCartesian()

### Community 54 - "Community 54"
Cohesion: 0.67
Nodes (2): get_cyber_divination_data(), 赛博算命核心算法 v2.1     - 输出适配 HTML 前端渲染

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (2): main(), safe_filename()

### Community 56 - "Community 56"
Cohesion: 0.67
Nodes (1): # TODO: Add actual script logic here

## Knowledge Gaps
- **418 isolated node(s):** `Generates design system recommendations from aggregated searches.`, `Load reasoning rules from CSV.`, `Execute searches across multiple domains.`, `Find matching reasoning rule for a category.`, `Apply reasoning rules to search results.` (+413 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 32`** (6 nodes): `calcularAportesPorDepto()`, `calcularSemafotoPorDepto()`, `getEmbalseColor()`, `getEmbalseRiesgo()`, `getEstadoSin()`, `embalses-coords.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (3 nodes): `describeArc()`, `polarToCartesian()`, `svg-math.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (3 nodes): `get_cyber_divination_data()`, `赛博算命核心算法 v2.1     - 输出适配 HTML 前端渲染`, `lunar_python.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (3 nodes): `main()`, `safe_filename()`, `generate_html.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (3 nodes): `main()`, `# TODO: Add actual script logic here`, `example.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `set()` connect `Community 1` to `Community 0`, `Community 3`, `Community 5`, `Community 6`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 23`, `Community 27`?**
  _High betweenness centrality (0.291) - this node is a cross-community bridge._
- **Why does `Document` connect `Community 2` to `Community 16`, `Community 6`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `fix_docx_accurate_pages()` connect `Community 6` to `Community 2`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Are the 49 inferred relationships involving `XMLEditor` (e.g. with `DocxXMLEditor` and `Document`) actually correct?**
  _`XMLEditor` has 49 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `BaseSchemaValidator` (e.g. with `PPTXSchemaValidator` and `Validator for PowerPoint presentation XML files against XSD schemas.`) actually correct?**
  _`BaseSchemaValidator` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `Document` (e.g. with `XMLEditor` and `fix_docx_accurate_pages()`) actually correct?**
  _`Document` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 28 inferred relationships involving `set()` (e.g. with `.fit()` and `_resolve_page_indices()`) actually correct?**
  _`set()` has 28 INFERRED edges - model-reasoned connections that need verification._