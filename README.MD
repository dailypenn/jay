# Why Jay
We are in the process of transitioning to the convention of naming our projects by bird names.
Starting with Canada Goose for mobile, we are naming the graphQL backend by jay for two reasons (according to @dtao).
- Blue Jay is a bird
- Jay **Gatsby** has Gatsby in it

# Development
run `npm start`, explorer is at `localhost:5000/graphql`

# Example query
### Home Page
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

# CEO docs
- https://docs.getsnworks.com/front-end/json-api/