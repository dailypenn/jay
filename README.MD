# Development
run npm start bud, explorer is at localhost:5000/graphql

## Example query
Note: it should be possible to abstract out a lot of the code below using fragments or ...
```
query {
  centerpiece: articles(first: 1, section: "centerpiece") {
    hasNextPage
    edges {
      article {
        headline
      }
      cursor
    }
  }
  
  top: articles(first: 5, section: "top") {
    hasNextPage
    edges {
      article {
        headline
      }
      cursor
    }
  }
  
  most_recent: articles(first: 5, section: "news") {
    hasNextPage
    edges {
      article {
        headline
      }
      cursor
    }
  }
  
}
```