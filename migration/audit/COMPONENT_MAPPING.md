# Component Mapping: base-ui → shadcn/ui

## Direct Mappings (1:1)

| base-ui Component | shadcn Component | Effort | Status |
|-------------------|------------------|--------|--------|
| Button | ui/button | 2h | PENDING |
| Input | ui/input | 1h | PENDING |
| Card | ui/card | 1h | PENDING |
| Dialog | ui/dialog | 3h | PENDING |
| Tabs | ui/tabs | 2h | PENDING |
| Select | ui/select | 3h | PENDING |
| Checkbox | ui/checkbox | 2h | PENDING |
| RadioGroup | ui/radio-group | 2h | PENDING |
| Switch | ui/switch | 1h | PENDING |
| Form | ui/form | 4h | PENDING |
| Label | ui/label | 1h | PENDING |
| Textarea | ui/textarea | 1h | PENDING |
| Progress | ui/progress | 1h | PENDING |
| Separator | ui/separator | 1h | PENDING |
| Badge | ui/badge | 1h | PENDING |
| Avatar | ui/avatar | 2h | PENDING |
| Skeleton | ui/skeleton | 1h | PENDING |
| ScrollArea | ui/scroll-area | 2h | PENDING |
| Tooltip | ui/tooltip | 2h | PENDING |
| Popover | ui/popover | 3h | PENDING |
| DropdownMenu | ui/dropdown-menu | 4h | PENDING |
| Toast | ui/toast | 3h | PENDING |
| AlertDialog | ui/alert-dialog | 3h | PENDING |
| Sheet | ui/sheet | 3h | PENDING |
| Drawer | ui/drawer | 3h | PENDING |
| NavigationMenu | ui/navigation-menu | 4h | PENDING |
| Menubar | ui/menubar | 4h | PENDING |
| Collapsible | ui/collapsible | 2h | PENDING |
| Accordion | ui/accordion | 2h | PENDING |

## Custom Components (Need Build)

| base-ui Component | shadcn Alternative | Effort | Notes |
|-------------------|--------------------|--------|-------|
| DataTable | ui/table + TanStack Table | 2 days | Custom wrapper needed |
| Calendar | ui/calendar | 1 day | Already exists |
| DatePicker | ui/calendar + popover | 1 day | Build custom |
| Command (cmd+k) | ui/command | 2 days | Already exists |
| FileUpload | Custom + shadcn button | 1 day | Build new |
| RichTextEditor | TipTap integration | 3 days | External lib |
| TreeView | Custom with D3/Canvas | 5 days | Build new for genealogy |
| KinshipFinder | Custom algorithm | 3 days | Build new |
| KanbanBoard | Custom with @dnd-kit | 2 days | Build new |
| GanttChart | Custom or library | 5 days | Optional |

## Notes
- Effort estimates for 1 developer
- Status: PENDING → IN_PROGRESS → DONE
- Prioritize direct mappings first (Tier 1), then custom components (Tier 2)
