### Setup
1. Get app and postgres running ```docker compose up -d```
2. Apply database migration ```npx prisma migrate deploy```
3. Seed the database ```npm run seed```
4. Webserver available at ```localhost:3000```

### Tests
- Unit tests: ```npm run test```
- Integration tests: ```npm run test:integration```

### Endpoints
- ```/api/attributes```
  - Get a paginated list of attributes.
  - **Query Parameters:**
    | Name | Type | Description | Default |
    | --- | --- | --- | --- |
    | `keyword` | string | The keyword to search for in attribute names and keys. | |
    | `categoryIds` | bigint | Filter attributes by category IDs. Pass multiple values by repeating the key, e.g., `categoryIds=1&categoryIds=2`. | |
    | `linkTypes` | 'direct' \| 'inherited' \| 'global' | Filter attributes by link types. Pass multiple values by repeating the key, e.g., `linkTypes=direct&linkTypes=inherited`. | |
    | `notApplicable` | boolean | Show only attributes that are not applicable. | |
    | `sortBy` | 'id' \| 'name' \| 'key' \| 'createdAt' \| 'updatedAt' | The field to sort the attributes by. | 'name' |
    | `sortOrder` | 'asc' \| 'desc' | The order to sort the attributes in. | 'asc' |
    | `page` | number | The page number for pagination. | 1 |
    | `limit` | number | The number of items per page for pagination. | 10 |
- ```/api/categories/tree```
  - Get the category tree structure.
  - **Query Parameters:**
    | Name | Type | Description | Default |
    | --- | --- | --- | --- |
    | `includeCounts` | boolean | Whether to include the count of attributes for each category. | false |
- ```/metrics```
- ```/health```
- ```/ready```

### Examples
- ```localhost:3000/api/attributes?categoryIds=1&categoryIds=2&linkTypes=direct&linkTypes=inherited&notApplicable=false&keyword=os&sortBy=key&sortOrder=desc&page=1&limit=5```
- ```localhost:3000/api/categories/tree?includeCounts=true```

### Performance & Scalability - handling 10x scale (10M+ products)
1. The ```CategoryTree``` table has been added for fast lookups of relationships between categories. It should be maintained during category insert/update/delete
2. A more immediate improvement would be to create an ```AttributeLink``` table (defined in ```buildAttributeLinksBaseSql```), it stores the relationship between attributes and their corresponding linkType from the perspective of selected categories. This table should be updated whenever attributes or category-attribute relationship change. A materialized view approach could also be considered if immediate visibility of changes of attributes isn't required
3. The ```/api/categories/tree``` endpoint essentially returns the same data for all users. The complete response including counts could be cached in Redis for fast retrieval. The cache can be invalidated when attributes or categories are modified, and it should have a reasonable TTL. At the scale of 10M+ products and in the context of this category tree, I assume it does not require real-time accuracy of product counts, so a TTL from an hour to a day would work
4. Investigate query performance and implement index based on query plans
5. If attribute keyword search performance becomes a bottleneck, an inverted index could be added, like postgres GIN on ```Attribute``` table
6. Monitor webserver and database performance. I expect database to reach resource limit first, in which vertically scaling with more CPU or RAM should be considered. If the webserver becomes a bottleneck, horizontal scaling across multiple instances can help to handle higher request throughput 

