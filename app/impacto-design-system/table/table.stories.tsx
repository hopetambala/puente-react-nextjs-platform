import { StoryObj } from '@storybook/react';
// import FilterPanel from '../../../shared/filter-panel/filter-panel';
// import { ReactSelect } from '../_deprecated/select/react-select';
// import { Banner } from '../banner/banner';
// import { Button } from '../button/button';
// import { PageSizeSelect } from '../page-size-select/page-size-select';
// import { Pagination } from '../pagination/pagination';
// import { Search } from '../search/search';
// import { Stack } from '../stack/stack';
// import { Tag } from '../tag/tag';
// import { Text } from '../text/text';
// import styles from './css/table.css';
import Table from '.';
import {
  // TEST_MARKET_OPTIONS,
  columns,
  defaultData,
} from './table.stories-data';


export default {
  title: 'Components/Tables/Table',
  component: Table,
  argTypes: {
    className: {
      table: {
        disable: true,
      },
    },
    subTitle: {
      control: 'text',
    },
    analyticsEvent: {
      table: {
        disable: true,
      },
    },
  },
} ;

type Story = StoryObj<typeof Table>


// const Template: ComponentStory<typeof Table> = (args) => (
  // <Table {...args} data={defaultData} columns={columns} allRowsLength={defaultData.length} />
// );

// export const Primary = Template.bind({});
// Primary.args = {
//   // tableTitle: 'English Soccer Players',
//   units: 'records',
// };

const TableStory = () => <Table
    units='records'
    data={defaultData}
    columns={columns as any}
    // allRowsLength={defaultData.length}
  />



export const Example: Story = {
  render: TableStory,
  parameters: {
    docs: {
      source: { type: 'dynamic' },
    },
  },
}

/**
 * Subtitle Example with Vertical Subtitle
 */

// export const Subtitle = Template.bind({});
// Subtitle.args = {
//   titleText: 'English Soccer Players',
//   units: 'players',
//   subTitle: 'Winning Teams View',
//   isTitleVertical: true,
// };

// /**
//  * Subtitle Example with Horizontal Subtitle
//  */

// export const HoritzontalSubtitle = Template.bind({});
// HoritzontalSubtitle.args = {
//   titleText: 'English Soccer Players',
//   units: 'players',
//   subTitle: 'Winning Teams View',
//   isTitleVertical: false,
// };

// /**
//  *  Resizable Example
//  */
// export const Resizable = Template.bind({});
// Resizable.args = {
//   ...Primary.args,
//   isResizable: true,
// };
// Resizable.parameters = {
//   docs: {
//     description: {
//       story:
//         "Columns can be resized if there's available column space within the columns. A drag handler appears on hover of the header cell",
//     },
//   },
// };

// /**
//  *  Sorting Example
//  */
// const SortingTemplate: ComponentStory<typeof Table> = (args) => {
//   const [tableData, setTableData] = useState(defaultData);
//   const [selectedRows, setSelectedRows] = useState<string[]>([]);
//   const [sorting, onSortingChange] = useState<SortingState>([]);
//   const units = 'players';

//   useEffect(() => {
//     const sort = sorting[0];
//     const sortedData = sort
//       ? orderBy(tableData, [sort.id], [sort.desc ? 'desc' : 'asc'])
//       : defaultData;
//     setTableData(sortedData);
//   }, [sorting]);

//   return (
//     <Table
//       {...args}
//       units={units}
//       data={tableData}
//       columns={columns}
//       selectedRows={selectedRows}
//       onSelectedRowsChanged={setSelectedRows}
//       sorting={sorting}
//       onSortingChange={onSortingChange}
//       allRowsLength={defaultData.length}
//     />
//   );
// };
// export const SortExample = SortingTemplate.bind({});
// SortExample.args = {
//   ...Primary.args,
//   primarySlotBulkActions: <Button intent="primary" text="Bulk Actions"></Button>,
//   hasTableActions: false,
// };
// SortExample.parameters = {
//   docs: {
//     description: {
//       story: 'Sorting is handled outside the component in order to have server-side data fetching',
//     },
//   },
// };

// /**
//  *  Bulk Actions/Primary Slot Example
//  */
// const ActionsTemplate: ComponentStory<typeof Table> = (args) => {
//   const [selectedRows, setSelectedRows] = useState<string[]>([]);

//   return (
//     <Table
//       {...args}
//       data={defaultData}
//       columns={columns}
//       selectedRows={selectedRows}
//       onSelectedRowsChanged={setSelectedRows}
//       allRowsLength={defaultData.length}
//     />
//   );
// };
// export const BulkActionsWithSelectedRows = ActionsTemplate.bind({});
// BulkActionsWithSelectedRows.args = {
//   ...Primary.args,
//   hasTableActions: true,
//   primarySlotBulkActions: <Button intent="primary" text="Bulk Actions"></Button>,
// };
// BulkActionsWithSelectedRows.parameters = {
//   docs: {
//     description: {
//       story: 'Bulk action UI pops up when a user selects one or more elements from the table.',
//     },
//   },
// };

// /**
//  *  Searching Example
//  */
// const SearchingTemplate: ComponentStory<typeof Table> = (args) => {
//   const [selectedRows, setSelectedRows] = useState<string[]>([]);
//   const [searchTerm, setSearchTerm] = useState('');

//   const handleSearch = (newSearchTerm: string) => {
//     setSearchTerm(newSearchTerm);
//   };

//   return (
//     <Table
//       {...args}
//       data={searchByValue(searchData, searchTerm)}
//       columns={columns}
//       selectedRows={selectedRows}
//       onSelectedRowsChanged={setSelectedRows}
//       primarySlotActions={
//         <Search
//           placeholder={{ id: 'patientSearch.placeholder' }}
//           searchTerm={searchTerm}
//           onSearch={handleSearch}
//           searchOnEmpty
//         />
//       }
//       allRowsLength={searchData.length}
//     />
//   );
// };
// export const SearchingExample = SearchingTemplate.bind({});
// SearchingExample.args = {
//   ...BulkActionsWithSelectedRows.args,
// };
// SearchingExample.parameters = {
//   docs: {
//     description: {
//       story:
//         'Search works similarly to other functionality in this table where by the user/developer manages the filtering of rows of data outside this UI component. In this example, we show a simpliefied way for you to include a searchbar to filter data in this table component',
//     },
//   },
// };

// /**
//  *  Secondary Slot / Filtering Example
//  */
// const FilteringActionsTemplate: ComponentStory<typeof Table> = (args) => {
//   const [selectedRows, setSelectedRows] = useState<string[]>([]);

//   const keys = ['market', 'name'];
//   const values = ['Brooklyn', 'Bukayo Saka'];

//   const result = searchData.filter((e: any) =>
//     keys.every(function (a) {
//       return values.includes(e[a]);
//     }),
//   );
//   return (
//     <div>
//       {result.length === 0 && <Text text="Refresh page if no data shows up" />}
//       <Table
//         {...args}
//         data={result}
//         columns={columns}
//         selectedRows={selectedRows}
//         onSelectedRowsChanged={setSelectedRows}
//         allRowsLength={searchData.length}
//       />
//     </div>
//   );
// };
// export const SecondarySlotExampleUsingBulkActions = FilteringActionsTemplate.bind({});
// SecondarySlotExampleUsingBulkActions.args = {
//   ...BulkActionsWithSelectedRows.args,
//   secondarySlotActions: (
//     <Stack spacing="medium">
//       <Tag style="clear" hasBorder isHoverEffectsDisabled text="Market: Brooklyn"></Tag>
//       <Tag style="clear" hasBorder isHoverEffectsDisabled text="Name: Bukayo Saka"></Tag>
//     </Stack>
//   ),
// };
// SecondarySlotExampleUsingBulkActions.parameters = {
//   docs: {
//     description: {
//       story:
//         "There's space below the table title for secondary UI elements like filtering pills and tags",
//     },
//   },
// };

// /**
//  *  Banner/Tertiary Slot Example
//  */
// const BannerContentTemplate: ComponentStory<typeof Table> = (args) => {
//   const [selectedRows, setSelectedRows] = useState<string[]>([]);
//   const units = 'players';

//   const shouldRenderSelectAll = selectedRows.length === defaultData.length;

//   const bannerContent = () =>
//     shouldRenderSelectAll ? (
//       <Banner
//         intent="primary"
//         isFullWidth
//         text={`All ${selectedRows.length} ${units} on this page are selected`}
//         buttonText={`Select all ${selectedRows.length * 2} ${units} in this table`}
//         onClick={() => {}}
//       />
//     ) : (
//       <Banner
//         isFullWidth
//         intent="warning"
//         text="Press header checkbox to see a bulk select all example"
//         onClick={() => {}}
//       />
//     );

//   return (
//     <Table
//       {...args}
//       units={units}
//       bannerContent={bannerContent()}
//       data={defaultData}
//       columns={columns}
//       selectedRows={selectedRows}
//       onSelectedRowsChanged={setSelectedRows}
//       allRowsLength={defaultData.length}
//     />
//   );
// };
// export const BannerContentExampleWithSelectAllContentExample = BannerContentTemplate.bind({});
// BannerContentExampleWithSelectAllContentExample.args = {
//   ...BulkActionsWithSelectedRows.args,
// };
// BannerContentExampleWithSelectAllContentExample.parameters = {
//   docs: {
//     description: {
//       story:
//         'You can pass in a component that spans the width of the table between the table header and table body. This is useful for global table actions like a banner for selecting more data than is currently rendered in the table and other bulk actions.',
//     },
//   },
// };

// export const BannerContentExampleSecondarySlotExample = BannerContentTemplate.bind({});
// BannerContentExampleSecondarySlotExample.args = {
//   ...BulkActionsWithSelectedRows.args,
//   ...SecondarySlotExampleUsingBulkActions.args,
// };

// /**
//  *  Pagination Example
//  */
// const PaginationTemplate: ComponentStory<typeof Table> = (args) => {
//   const [selectedRows, setSelectedRows] = useState<string[]>([]);
//   const [pageNumber, setPageNumber] = useState<number>(0);
//   const [pageSize, setPageSize] = useState<number>(15);
//   const units = 'players';

//   const chunkedData = chunk(paginationData, pageSize);

//   const shouldRenderSelectAll = selectedRows.length === chunkedData[pageNumber].length;

//   const selectAll = () => {
//     const allSelected = paginationData.map((element) => element.id);
//     setSelectedRows(allSelected);
//   };

//   const onPageSizeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const pathName = 'players';
//     const pageSizeKey = `pageSize.${pathName}`;
//     const pageSize = e.target.value;

//     localStorage.setItem(pageSizeKey, pageSize);

//     setPageSize(Number(pageSize));
//   };

//   const bannerContent = () =>
//     shouldRenderSelectAll ? (
//       <Banner
//         intent="primary"
//         isFullWidth
//         text={`All ${selectedRows.length} ${units} on this page are selected`}
//         buttonText={`Select all ${paginationData.length} ${units} in this table`}
//         onClick={() => selectAll()}
//       />
//     ) : (
//       <Banner
//         isFullWidth
//         intent="warning"
//         text={
//           selectedRows.length == paginationData.length
//             ? 'All checkboxes in the rows are selected'
//             : 'Press header checkbox to see a bulk select all example with pagination'
//         }
//         onClick={() => {}}
//       />
//     );

//   const footerContent = () => (
//     <div className={styles.footerContainer}>
//       <PageSizeSelect onChange={onPageSizeSelect} pathName="players" pageSize={pageSize} />
//       <Pagination
//         pageInfo={{
//           hasNextPage: chunkedData[pageNumber + 1] ? true : false,
//           hasPreviousPage: chunkedData[pageNumber - 1] ? true : false,
//         }}
//         totalCount={paginationData.length}
//         pageNumber={pageNumber}
//         pageSize={pageSize}
//         onSetPage={setPageNumber}
//       />
//     </div>
//   );

//   return (
//     <Table
//       {...args}
//       units={units}
//       bannerContent={bannerContent()}
//       data={chunkedData[pageNumber]}
//       columns={columns}
//       selectedRows={selectedRows}
//       onSelectedRowsChanged={setSelectedRows}
//       footer={footerContent()}
//       allRowsLength={paginationData.length}
//     />
//   );
// };
// export const PaginationFooterExample = PaginationTemplate.bind({});
// PaginationFooterExample.args = {
//   ...BulkActionsWithSelectedRows.args,
// };
// PaginationFooterExample.parameters = {
//   docs: {
//     description: {
//       story:
//         'You can pass in a component that spans the width of the table between the table header and table body. This is useful for global table actions like a banner for selecting more data than is currently rendered in the table and other bulk actions.',
//     },
//   },
// };

// /**
//  *  Hover Actions Example
//  */
// export const HoverActions = Template.bind({});
// HoverActions.args = {
//   ...Primary.args,
//   hoverActions: hoverColumn,
// };
// HoverActions.parameters = {
//   docs: {
//     description: {
//       story: 'Rows can have hover actions that appear when the users mouse is over the row.',
//     },
//   },
// };

// /**
//  *  KitchenSink Example
//  */
// const KitchenSinkTemplate: ComponentStory<typeof Table> = (args) => {
//   const units = 'players';

//   const [selectedRows, setSelectedRows] = useState<string[]>([]);
//   const [sorting, onSortingChange] = useState<SortingState>([]);
//   const [filter, setFilter] = useState<any>();
//   const [isPanelVisible, setPanelVisible] = useState(false);
//   const [pageNumber, setPageNumber] = useState<number>(0);
//   const [pageSize, setPageSize] = useState<number>(15);
//   const [searchTerm, setSearchTerm] = useState('');

//   /**
//    * Searching Logic
//    */

//   const handleSearch = (newSearchTerm: string) => {
//     setSearchTerm(newSearchTerm);
//   };

//   /**
//    * Filtering Logic
//    */
//   const filteringKeys = filter ? ['market'] : [];
//   const filteringValues = filter ? [filter.value] : [];

//   const filteredData = searchByValue(paginationData || [], searchTerm).filter((e: any) =>
//     filteringKeys.every(function (a) {
//       return filteringValues.includes(e[a]);
//     }),
//   );

//   /**
//    * Pagination Logic
//    */
//   const chunkedData = chunk(filteredData, pageSize);
//   const shouldRenderSelectAll = selectedRows.length === chunkedData[pageNumber]?.length;

//   const selectAll = () => {
//     const allSelected = filteredData.map((element) => element.id);
//     setSelectedRows(allSelected);
//   };
//   const onPageSizeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const pathName = 'players';
//     const pageSizeKey = `pageSize.${pathName}`;
//     const pageSize = e.target.value;

//     localStorage.setItem(pageSizeKey, pageSize);

//     setPageSize(Number(pageSize));
//   };
//   const bannerContent = () =>
//     shouldRenderSelectAll ? (
//       <Banner
//         intent="primary"
//         isFullWidth
//         text={`All ${selectedRows.length} ${units} on this page are selected`}
//         buttonText={`Select all ${filteredData.length} ${units} in this table`}
//         onClick={() => selectAll()}
//       />
//     ) : (
//       <Banner
//         isFullWidth
//         intent="warning"
//         text={
//           selectedRows.length == filteredData.length
//             ? 'All checkboxes in the rows are selected'
//             : 'Press header checkbox to see a bulk select all example with pagination'
//         }
//         onClick={() => {}}
//       />
//     );
//   const footerContent = () => (
//     <div className={styles.footerContainer}>
//       <PageSizeSelect onChange={onPageSizeSelect} pathName="players" pageSize={pageSize} />
//       <Pagination
//         pageInfo={{
//           hasNextPage: chunkedData[pageNumber + 1] ? true : false,
//           hasPreviousPage: chunkedData[pageNumber - 1] ? true : false,
//         }}
//         totalCount={filteredData.length}
//         pageNumber={pageNumber}
//         pageSize={pageSize}
//         onSetPage={setPageNumber}
//       />
//     </div>
//   );

//   /**
//    * Sorting Logic
//    */
//   const sortedData = sorting[0]
//     ? orderBy(chunkedData[pageNumber], [sorting[0].id], [sorting[0].desc ? 'desc' : 'asc'])
//     : chunkedData[pageNumber];

//   return (
//     <div>
//       <Table
//         {...args}
//         allRowsLength={paginationData.length}
//         units={units}
//         bannerContent={bannerContent()}
//         data={sortedData || []}
//         columns={columns}
//         selectedRows={selectedRows}
//         onSelectedRowsChanged={setSelectedRows}
//         sorting={sorting}
//         onSortingChange={onSortingChange}
//         primarySlotActions={
//           <Stack>
//             <Button text="Filter" onClick={() => setPanelVisible(true)} />
//             <Search
//               placeholder={{ id: 'patientSearch.placeholder' }}
//               searchTerm={searchTerm}
//               onSearch={handleSearch}
//               searchOnEmpty
//             />
//           </Stack>
//         }
//         secondarySlotActions={
//           <Stack spacing="medium">
//             {filter && (
//               <Tag
//                 style="clear"
//                 hasBorder
//                 isHoverEffectsDisabled
//                 text={`Market: ${filter.label}`}
//                 onRemove={() => setFilter(null)}
//               ></Tag>
//             )}
//           </Stack>
//         }
//         footer={footerContent()}
//       />
//       <FilterPanel
//         isVisible={isPanelVisible}
//         onClickCancel={() => setPanelVisible(false)}
//         onClickClearAll={() => setFilter(null)}
//         onClickApply={() => setPanelVisible(false)}
//       >
//         <ReactSelect
//           label="Cityblock Market"
//           isAsync={false}
//           value={filter}
//           options={TEST_MARKET_OPTIONS}
//           onChange={(option: any) => setFilter(option)}
//         />
//       </FilterPanel>
//     </div>
//   );
// };
// export const KitchenSinkExample = KitchenSinkTemplate.bind({});
// KitchenSinkExample.args = {
//   ...BulkActionsWithSelectedRows.args,
//   subTitle: 'Winning Teams View',
//   isTitleVertical: true,
// };
// KitchenSinkExample.parameters = {
//   docs: {
//     description: {
//       story:
//         "Here's an example of everything put together! In this example, the data is filtered by the Brooklyn Market and the user is able to search, sort, and select players based on that data",
//     },
//   },
// };
