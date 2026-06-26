# Client-Next Components to Convert

## Total Count
- Base-ui UI components: ~25 (see COMPONENT_MAPPING.md)
- Custom components: ~45 (domain-specific)
- **Total**: ~70 components

## List by Category

### Basic (Tier 1) - 2.5 days
- [ ] Button
- [ ] Input
- [ ] Card
- [ ] Label
- [ ] Textarea
- [ ] Checkbox
- [ ] RadioGroup
- [ ] Switch
- [ ] Select
- [ ] Badge
- [ ] Progress
- [ ] Separator
- [ ] Avatar
- [ ] Skeleton
- [ ] ScrollArea

### Forms & Overlays (Tier 2) - 2 days
- [ ] Form
- [ ] FormField
- [ ] FormItem
- [ ] FormLabel
- [ ] FormControl
- [ ] FormMessage
- [ ] Dialog
- [ ] Popover
- [ ] Tooltip
- [ ] DropdownMenu
- [ ] Toast
- [ ] AlertDialog
- [ ] Sheet
- [ ] Drawer

### Navigation (Tier 2) - 1 day
- [ ] Tabs
- [ ] NavigationMenu
- [ ] Menubar
- [ ] Breadcrumb (if exists)
- [ ] Command

### Data Display (Tier 2) - 1 day
- [ ] Table (TanStack wrapper)
- [ ] Pagination
- [ ] AspectRatio

### Custom Genealogy Components (Tier 3) - 5 days
- [ ] FamilyTree (D3/Canvas)
- [ ] KinshipFinder (algorithm)
- [ ] Timeline (vertical)
- [ ] PersonCard
- [ ] RelationshipLine (SVG)
- [ ] GEDCOMImport
- [ ] GEDCOMExport

### Custom ERP Components (Tier 3) - 4 days
- [ ] KanbanBoard (@dnd-kit)
- [ ] TaskCard
- [ ] ProjectTimeline
- [ ] WorkflowDiagram
- [ ] NotificationCenter

## Migration Strategy
1. Week 3: Convert all Tier 1 & 2 components (direct shadcn mappings)
2. Week 4: Build Tier 3 custom components
3. Update all imports in migrated pages

## Effort Estimate
- Tier 1: 20h
- Tier 2: 35h
- Tier 3: 120h (5 days genealogy + 4 days ERP)
- **Total**: ~175h ≈ 2 weeks (with 1 dev)
